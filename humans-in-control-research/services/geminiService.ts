
import { GoogleGenAI, Type, Schema, Chat, GenerateContentResponse } from "@google/genai";
import { FileUpload, AnalysisResult, Persona, ScriptScene, Slide, SlideLayout, StepResult_Ingestion, StepResult_Themes, StepResult_Personas, StepResult_Structure, StepResult_Narrative, StepResult_Final, Theme, SlideStyle, Citation, StrategicRecommendation, OutputOption, StepResult_JourneyMap, StepResult_TechArch, ServiceBlueprintStage, TechnicalArchitecture, TechNode, TechFlow, PRD, StepResult_PRD, StrategicRoadmap, StepResult_Roadmap, StepResult_Recommendations, StepResult_CrossCuttingSynthesis, DeckInputContext, ContentBlock } from "../types";
import { tryRepairJson, OPUS_CAP_ACTIVE, HIC_CACHE_BREAK, stripCacheMarkers, artifactModelFor, endpointForModel } from './aiRouter';
import { engagementSlugFor } from './engagementSlug';
import { recordAICall } from './costMeter';

// 2026-06-20 COST METER FIX. The GoogleGenAI client below talks DIRECT to Google
// (no proxy baseUrl), so these calls bypass BOTH the proxy and callAIWithRetry -
// the only place wired to the cost meter. The in-app cost calculator therefore
// under-counted the dominant spend (the breadth-pass Gemini 3.1 Pro calls were
// invisible - the root reason a $750 Gemini bill was a surprise). Record every
// direct SDK call here. Accounting must NEVER throw into a generation path.
//   - Non-stream: pass the response (has .usageMetadata).
//   - Stream: pass { usageMetadata } captured from the final chunk.
function recordDirectGeminiCall(label: string, model: string, response: any): void {
    try { recordAICall({ label, model, response, durationMs: 0 }); } catch { /* never break generation */ }
}
import { getActiveConstraints } from './promptImprovementEngine';
import { buildEvidenceCatalogBlock, loadDeliverableContext, renderDeliverableContextBlock } from './evidenceCatalogBuilder';
import { buildVerbalizedConfidenceDirective, inspectCalibration, normalizeSelfAssessment } from './verbalizedConfidence';
import { buildReinforceFeedbackString, shouldReinforce, appendUncertaintyLedger } from './reinforcementInference';
import { shapeUpstreamForRecs } from './intelligenceShaping';
import { verifyDeliverableCitations } from './citationGrounding';
import { discriminate, snapshotActiveConstraints } from './improvementDiscriminator';
import { scoreDeliverable, type DeliverableKind as ScorerKind } from './deliverableScorer';
import { resolveDeliverableBodies, manifestPointerBlock, currentEngagementSlug } from './wikiPointerResolver';

// --- CONSTANTS ---
const DEFAULT_STYLE: SlideStyle = {
    backgroundColor: '#ffffff',
    headerColor: '#115054',
    textColor: '#141414',
    accentColor: '#caca20'
};

// --- RETRY LOGIC ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
    operation: () => Promise<T>, 
    retries = 3, 
    baseDelay = 2000, 
    operationName = "Gemini API Call"
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const isTransient =
                error.status === 503 ||
                error.code === 503 ||
                error.message?.includes('503') ||
                error.message?.includes('overloaded') ||
                error.status === 429 ||
                error.code === 429 ||
                error.message?.includes('429') ||
                error.message?.includes('Quota') ||
                error.status === 500 ||
                error.code === 500 ||
                error.message?.includes('Internal Server Error');
            // Network errors: connection reset, network changed, fetch failures
            const isNetworkError =
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('NETWORK') ||
                error.message?.includes('network') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('CONNECTION_RESET') ||
                error.message?.includes('socket hang up') ||
                error.message?.includes('NetworkError') ||
                error.name === 'TypeError' && !error.status;

            if ((isTransient || isNetworkError) && i < retries - 1) {
                const delay = isNetworkError
                    ? Math.max(baseDelay, 5000) * Math.pow(2, i) // Network errors: start at 5s, double each time
                    : baseDelay * Math.pow(2, i);
                console.warn(`${operationName} failed with ${error.status || error.code || error.message?.substring(0, 40) || 'error'}. Retrying in ${Math.round(delay/1000)}s... (Attempt ${i + 1}/${retries})`);
                await wait(delay);
                continue;
            }
            break;
        }
    }
    throw lastError;
}

// --- IMAGE GENERATION HELPERS ---

// Global visualization style - set by App.tsx when user selects a style
let _activeVisStyleId: string = 'photorealistic';
export function setActiveVisualizationStyle(styleId: string) { _activeVisStyleId = styleId; }
export function getActiveVisualizationStyle(): string { return _activeVisStyleId; }

/**
 * Heuristic detection for personal names (First, First Last, First M. Last).
 * Used to defend against the model emitting "Sarah Chen" or "Marcus Johnson"
 * as a persona archetype title. Returns true ONLY when the string looks
 * unambiguously like a personal name - short (<= 4 tokens), all tokens
 * Capitalized, contains no role/posture words, and matches the
 * single-given-name + optional-surname shape.
 *
 * False positives are acceptable here: if the model returns something
 * borderline like "Sarah the Skeptic", we'd rather replace with a generic
 * archetype than ship a personal name. False negatives are NOT - a missed
 * "Sarah Chen" reaches the user.
 */
function isLikelyPersonalName(s: string): boolean {
    if (!s) return false;
    const trimmed = s.trim();
    if (trimmed.length < 2 || trimmed.length > 60) return false;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 1 || tokens.length > 4) return false;

    // Role/posture keywords that disqualify the string from being a personal name
    const archetypeKeywords = /\b(driven|averse|weary|focused|seeking|skeptical|anxious|first-?gen|career|outcomes?|cost-?conscious|time-?starved|risk-?averse|bureaucracy|compliance|advancement|stakeholder|decision|maker|champion|advocate|user|buyer|coach|advisor|head|lead|manager|director|officer|administrator|faculty|student|alumni|donor|teacher|engineer|developer|designer|analyst|researcher|partner|customer|client|patient|consumer|employer|coordinator|specialist|architect|professional|leader|builder|founder|operator|practitioner|expert|generalist|enthusiast|skeptic|adopter|laggard|innovator|persona|archetype|primary|secondary|key)\b/i;
    if (archetypeKeywords.test(trimmed)) return false;

    // Every token must start with an uppercase letter and be alphabetic
    // (allowing "M." middle initials and apostrophes like O'Brien)
    const tokenRe = /^[A-Z][a-z]+(?:'[A-Z][a-z]+)?$|^[A-Z]\.$/;
    return tokens.every(t => tokenRe.test(t));
}

/**
 * Generate a photorealistic portrait using Imagen 4.
 * Bypasses the NXT Design System style prompts - portraits must be photorealistic, not flat geometric.
 * CSS grayscale filter is applied at render time, not at generation time.
 */
export const generatePortrait = async (prompt: string): Promise<string | undefined> => {
    // Use the SAME model and config that works for all other image generation
    // gemini-3.1-flash-image-preview with imageConfig - the proven working approach
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: { aspectRatio: '1:1' as any }
            }
        }), 5, 5000, "Portrait Generation");

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
            }
        }
    } catch (e: any) {
        console.error('Portrait generation failed:', e.message);
    }
    return undefined;
};

export const generateImage = async (prompt: string, aspectRatio: string = "16:9", refImageBase64?: string, openPrompt: boolean = false): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let finalPrompt: string;

    if (openPrompt) {
        // Open prompt mode - no NXT style restrictions. User describes whatever they want.
        const noTextConstraint = 'Do NOT include any text, words, letters, numbers, or labels in this image.';
        finalPrompt = `${prompt}. Professional quality, high resolution. ${noTextConstraint}`;
    } else {
        // NXT style mode - flat geometric business minimalism
        const { getStyleById } = await import('./visualizationStyles');
        const style = getStyleById(_activeVisStyleId);
        const context = (aspectRatio === "1:1" || aspectRatio === "3:4") ? 'portrait' : 'scene';
        const styleBase = style.promptBase[context];
        const negativeConstraints = style.negativeConstraints;
        const noTextConstraint = 'CRITICAL: Do NOT include any text, words, letters, numbers, labels, captions, or typography in this image. AI image models cannot spell. All text will be added as a separate overlay. The image must contain ZERO readable characters.';
        finalPrompt = `${styleBase}. Depict specifically: ${prompt}. Ensure all visual elements relate to this description. ${negativeConstraints} ${noTextConstraint}`;
    }

    const parts: any[] = [{ text: finalPrompt }];
    if (refImageBase64) {
        const cleanBase64 = refImageBase64.includes('base64,') 
            ? refImageBase64.split('base64,')[1] 
            : refImageBase64;
            
        parts.unshift({
            inlineData: {
                mimeType: 'image/png',
                data: cleanBase64
            }
        });
        parts[parts.length-1].text += " Maintain strict character consistency with the reference image.";
    }

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any }
      }
    }), 5, 5000, "Image Generation");

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/jpeg';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.warn("Image generation failed for prompt:", prompt, error);
    return undefined;
  }
  return undefined;
};

// --- VIDEO GENERATION (VEO 3) ---
export const generateSceneVideo = async (prompt: string, imageBase64?: string): Promise<string | undefined> => {
    try {
        const cleanBase64 = imageBase64?.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
        
        // Updated Video Prompt for Professional AR Style
        const styleSuffix = ". Cinematic video footage (4K). Realistic motion. Professional color grading. Integrated clean infographic overlays (charts, text bubbles) tracking with the scene. Modern documentary style. No misspellings.";
        const fullPrompt = `Animate strictly based on this description: ${prompt}. Ensure visual relevance. ${styleSuffix}`;
        
        // Define call function to wrap the API logic for retries/key switching
        const callVeo = async (apiKey: string | undefined) => {
             const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
             if (cleanBase64) {
                 return await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: fullPrompt,
                    image: {
                        imageBytes: cleanBase64,
                        mimeType: 'image/png', 
                    },
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: '16:9'
                    }
                });
            } else {
                 return await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: fullPrompt,
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: '16:9'
                    }
                });
            }
        };

        let operation;

        try {
             // Attempt 1: Try with existing key, retry only on transient errors
             operation = await withRetry(() => callVeo(process.env.API_KEY), 3, 5000, "Veo Video Generation");
        } catch (e: any) {
            // Handle 403 Permission Denied - requires new Paid API Key
            if (e.status === 403 || e.toString().includes('PERMISSION_DENIED') || e.message?.includes('403')) {
                console.warn("Veo Permission Denied. Requesting new API key...");
                if ((window as any).aistudio) {
                    await (window as any).aistudio.openSelectKey();
                    // Retry with fresh key from environment
                    operation = await callVeo(process.env.API_KEY);
                } else {
                    throw e;
                }
            } else {
                throw e;
            }
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let retries = 0;
        while (!operation.done && retries < 30) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({operation: operation});
            retries++;
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
             const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
             const blob = await response.blob();
             return URL.createObjectURL(blob);
        }
    } catch (e) {
        console.error("Veo generation failed", e);
    }
    return undefined;
};

// --- CONTENT REWRITE HELPER ---
export const rewriteSlideContent = async (slide: Slide, theme: Theme, layout: SlideLayout): Promise<Partial<Slide>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
        REWRITE TASK:
        Take the following slide content and rewrite it to focus heavily on the Theme: "${theme.name} - ${theme.description}".
        Target Layout: ${layout}
        
        Instructions:
        1. Rewrite the Title to be punchy and theme-aligned.
        2. Rewrite the Content (Bullet points) to use the language of the theme. STRICT LIMIT: Maximum 3 bullet points.
        3. Rewrite the Visual Prompt to describe a photorealistic image that visualizes this theme professionally. Use 4K photography terms.
        4. Rewrite the Narrative (Voiceover) to explain this slide through the lens of the theme.
        
        Output JSON only.
    `;
    
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            content: { type: Type.ARRAY, items: { type: Type.STRING } },
            narrative: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
        },
        required: ["title", "content", "narrative", "visualPrompt"]
    };

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    }), 3, 2000, "Slide Rewrite");
    
    try {
        if (response.text) {
            return JSON.parse(tryRepairJson(response.text));
        }
    } catch (e) {
        console.error("Failed to parse rewrite response", e);
    }
    return {};
};

export class GenAISession {
    private chatSession: Chat;
    private ai: GoogleGenAI;
    private goal: string;
    private approach: string;
    private selectedOutputs: OutputOption[];
    // 2026-05-03 - Stored for the GPT fallback path (see executeStepViaGPT).
    // Gemini Flash repetition-collapses on structured JSON when the corpus
    // contains any repeated token pattern (filenames, port numbers like 8080,
    // dollar figures, etc.). The RepetitionGuard truncates at 20K chars,
    // leaving downstream JSON parsing to salvage fragments - often yielding
    // 0-1 items instead of the evidence-warranted count. Claude Opus 4.7 does
    // not have this failure mode on long structured output, so synthesis
    // steps (themes, personas, recommendations, gap analysis, service
    // blueprint) route to it via the proxy.
    private systemInstructionCached: string = '';
    private accumulatedContext: Array<{ label: string; payload: string }> = [];
    private corpusContextCached: string = '';
    // 2026-04-29 - Two-pass theme architecture (consulting-grade).
    // Pass 1 BREADTH calls Gemini 3.1 Pro outside the chat session (one-shot)
    // for a fresh, unanchored corpus pass. We cache the original ingestion
    // file parts so the Pro call can re-feed the same corpus (binaries +
    // text) into a separate context window. Pass 2 DEPTH then fans out to
    // Claude Opus 4.7 per-theme - those calls don't need the corpus, only
    // the breadth-theme payload (name/description/quote/citations).
    private corpusFileParts: any[] = [];
    private corpusUploadedFileCount: number = 0;
    private corpusHasIntelligence: boolean = false;
    // U3 - concatenated corpus text for citation-faithfulness verification.
    private corpusGroundingText: string = '';

    // 2026-06-07 (Phase 1, intent-realization-plan) - corpus-identity contract.
    // The grounding corpus MUST be a superset of every text any generator was
    // actually shown. Before this, corpusGroundingText held only the ingestion
    // fileParts, so deliverables generated from OTHER text (themes from archive
    // passages + topic clusters; personas from goal-evidence + 150-char citation
    // snippets) were verified against text the model never saw -> the 0/26 persona
    // and 6/58 theme "grounding" artifact. Every evidence-injection site now
    // registers the text it injects here, so a verbatim quote drawn from that
    // evidence verifies legitimately. This raises match rates by ALIGNING corpora,
    // NEVER by relaxing the grounding bar (the GROUNDING_MISMATCH_FLOOR stays).
    // Verification-only: this string is never sent to a model, so growth carries
    // ZERO token-budget cost (that is Phase 2's separate concern). Capped for
    // memory only; oldest evidence is dropped first if the cap is hit.
    private registerGroundingText(text: string | undefined | null): void {
        if (!text || typeof text !== 'string') return;
        const t = text.trim();
        if (t.length < 24) return;
        if (this.corpusGroundingText.includes(t)) return;   // cheap exact-block dedupe
        const CAP = 8_000_000;                               // ~8MB, memory guard only
        if (this.corpusGroundingText.length + t.length > CAP) {
            const overflow = (this.corpusGroundingText.length + t.length) - CAP;
            this.corpusGroundingText = this.corpusGroundingText.slice(overflow);
        }
        this.corpusGroundingText += '\n' + t;
    }
    // 2026-06-02 - Deterministic topic clusters (BERTopic-style) wired into the
    // theme stage so themes are GROUNDED in the corpus's actual cluster structure
    // rather than free-associated. App sets either the resolved result or the
    // in-flight job promise; generateThemes awaits the promise (bounded) so a
    // parallel topic job that finishes in time enriches themes.
    public topicClusters: any | null = null;
    public topicClustersPromise: Promise<any> | null = null;
    // 2026-06-02 (U1 - cognitive chain): the synthesis chain runs themes ->
    // personas -> recommendations on the SAME session, but generateRecommendations
    // never received the run's themes/personas though its prompt claims to "review
    // ALL themes and ALL persona pain points". It re-derived (and could fabricate)
    // them from raw sources. Store the actual results here as they're produced so
    // recommendations build on the run's real analysis. Empty for standalone calls
    // (graceful: the chain block is simply omitted).
    private lastThemes: any[] = [];
    private lastPersonas: any[] = [];
    // 2026-05-05 - Phase 0 (depth-maximization): every deliverable generator
    // now receives the same rawSources catalog that generateStrategicReport
    // already consumed. App.tsx calls setRawSources() once per run, after
    // research collection and curation, before deliverable generation kicks
    // off. Generators that wire it in inject the IRON LAW preamble + the
    // tiered article catalog directly into their prompts so they cite the
    // ~200-article external corpus instead of frozen client-document chunks.
    private rawSources: any[] = [];

    setRawSources(sources: any[] | undefined): void {
        this.rawSources = Array.isArray(sources) ? sources : [];
    }

    // 2026-05-19 - NotebookLM-style goal-filtered evidence pack.
    // Computed lazily on first request, cached for the session lifetime.
    // Used by ALL generate*() methods (themes, personas, journey,
    // recommendations, gap, roadmap, prd, blueprint, tech-arch, tech-audit,
    // competitive, strategic-report) to prepend the top-relevant wiki
    // chunks to their system prompt. Cuts noise from the off-topic 60%
    // of the corpus without losing fallback access to the full corpus.
    private goalEvidencePackPromise: Promise<string> | null = null;
    // 2026-05-19 - Track whether the cached promise contains a real evidence
    // pack vs. an empty fallback. Empty results should NOT poison the cache
    // for the whole session - the next generation call gets a fresh attempt.
    // Otherwise a single retrieval timeout disables NotebookLM retrieval for
    // every subsequent artifact in that session.
    private goalEvidenceCachedNonEmpty: boolean = false;

    // 2026-06-07 (Phase 2, intent-realization-plan) - manifest-chunk-retrieval.
    // When true, generators draw evidence via the MANDATORY chunk-pointer
    // contract (pickChunksForPrompt -> resolveChunks -> assembleChunkCorpus at a
    // 30K-token budget, KL selection auto-pinned) instead of the BANNED bulk
    // body injection (corpusFileParts) + the NOT-THE-CONTRACT embedding-RAG pack
    // (notebookRetrieval). The chunk corpus is ~30K tokens, cited by pointer, and
    // validated by the validate_chunk_citations.py Stop hook. Flag-gated so a
    // sparse-manifest engagement can fall back to the legacy bulk path rather
    // than generate from nothing.
    private useMcrCorpus: boolean = true;
    /** Chunk-id set resolved into the last MCR corpus block - for citation validation. */
    private lastCorpusChunkIds: string[] = [];

    // 2026-06-08 - LIVE THEME STREAMING. Set by App.tsx before generateThemes so
    // each sharded breadth WAVE pushes its accumulated themes out immediately. The
    // consumer merges with cached themes and updates themesResult (-> Research
    // Browser + Analyst chat context) and persists (-> themes.json corpus +
    // manifest count) as the re-synthesis pours in, instead of only at the end.
    private onThemeProgress?: (themes: any[]) => void;
    setThemeProgressCallback(cb?: (themes: any[]) => void): void { this.onThemeProgress = cb; }

    /**
     * Build a chunk-addressed CORPUS block per the manifest-chunk-retrieval
     * contract. Returns '' on empty catalog (caller falls back / flags); never
     * throws into a generation path. Stores resolved ids on lastCorpusChunkIds.
     */
    private async buildChunkCorpusBlock(promptText: string, opts: { tokenBudget?: number; excludeIds?: string[]; skipAutoPin?: boolean; broaden?: boolean } = {}): Promise<string> {
        try {
            const { pickChunksForPrompt, assembleChunkCorpus, chunkCitationInstructions, DEFAULT_CORPUS_TOKEN_BUDGET } = await import('./chunkRetrieval');
            const { resolveChunks } = await import('./wikiPointerResolver');
            // 2026-06-08 - Use the CANONICAL engagement slug (buildEngagementSlug:
            // extractResearchObjective + 60-char) so the retrieval slug matches the
            // ARCHIVAL slug exactly. Previously this hand-rolled a raw-goal 80-char
            // slug, so it could never match the 60-char objective-extracted slug the
            // wiki was written under (the catalog=0 mismatch). For fresh runs MCR is
            // still empty by design (articles aren't engagement-scoped), but on
            // cached/KL runs this guarantees archival===retrieval.
            let slug = 'default';
            try {
                const { buildEngagementSlug } = await import('./wikiService');
                slug = buildEngagementSlug(this.goal || 'default', 60) || 'default';
            } catch {
                slug = engagementSlugFor(this.goal || 'default') || 'default';
            }
            const picked = await pickChunksForPrompt(promptText, slug, {
                tokenBudget: opts.tokenBudget ?? DEFAULT_CORPUS_TOKEN_BUDGET,
                extraContext: this.goal || '',
                researchObjective: this.goal || '',   // tier-1.5: admit on-objective corpus by relevance
                excludeIds: opts.excludeIds,       // shard window: skip prior-shard chunks
                skipAutoPin: opts.skipAutoPin,     // shards 1..K do not re-pin cached selection
                broaden: opts.broaden,             // Phase 2: floor-retry widens to relevance-ranked backfill
            });
            if (!picked.chunkIds.length) {
                console.warn(`[MCR] no chunks selected for slug "${slug}" (catalog=${picked.catalogSize}) - corpus block empty; caller falls back to legacy path`);
                this.lastCorpusChunkIds = [];
                return '';
            }
            const resolved = await resolveChunks(picked.chunkIds);
            this.lastCorpusChunkIds = resolved.chunks.map(c => c.id);
            // Phase 1<->2 integration: the resolved chunks ARE the generation
            // corpus, so register them as the verification corpus too. Without
            // this, grounding checks the old fileParts snapshot and blanks
            // legitimate quotes (the observed 9/40 grounded, 31 blanked).
            this.registerGroundingText(resolved.chunks.map(c => c.text).join('\n\n'));
            const block = `${assembleChunkCorpus(resolved.chunks)}\n\n${chunkCitationInstructions()}`;
            console.log(`[MCR] corpus block: ${resolved.chunks.length} chunks, ~${picked.estimatedTokens} tok (budget ${picked.tokenBudget}, catalog ${picked.catalogSize}) slug=${slug}`);
            return block;
        } catch (e: any) {
            console.warn('[MCR] buildChunkCorpusBlock failed (non-fatal, falling back to legacy bulk path):', e?.message || e);
            this.lastCorpusChunkIds = [];
            return '';
        }
    }

    /**
     * 2026-06-09 STANDING RULE (memory: deliverables assemble from wiki+MANIFEST, not RAG).
     * Single grounding chokepoint for ON-DEMAND deliverables (personas, journey, recs, PRD,
     * roadmap, gap, tech-audit, competitive, tech-arch, report). Prefers manifest-chunk
     * retrieval (the SAME clean-chunk path generateThemes uses, cite-by-pointer, resilient to
     * an empty in-memory rawSources on a re-opened chat session). Falls back to the legacy
     * rawSources evidence catalog ONLY when the manifest yields nothing (brand-new engagement
     * with nothing tagged yet). This replaces the per-generator buildEvidenceCatalogBlock(
     * this.rawSources) / getGoalEvidenceBlock bulk-injection that produced hollow deliverables.
     */
    private async assembleDeliverableCorpus(label: string, opts: { tokenBudget?: number; minDistinctSources?: number } = {}): Promise<string> {
        // 2026-06-09 - prepend the brand DESIGN SYSTEM to EVERY deliverable's grounding
        // block (single chokepoint). All generators call this for evidenceBlock, so this
        // one prepend wires the design-system pull into all of them - the artifact uses
        // actual brand tokens + per-format dimensions regardless of deliverable type.
        let ds = '';
        try { ds = await this.assembleDesignSystem(); } catch { /* non-fatal */ }
        let corpus = '';
        try {
            const mcr = await this.buildChunkCorpusBlock(`${this.goal} ${label}`, { tokenBudget: opts.tokenBudget ?? 30_000 });
            if (mcr && mcr.length > 0) {
                console.log(`[assembleDeliverableCorpus/${label}] grounded from MANIFEST (${mcr.length} chars)`);
                corpus = mcr;
            } else {
                console.warn(`[assembleDeliverableCorpus/${label}] manifest empty - falling back to legacy rawSources catalog`);
            }
        } catch (e: any) {
            console.warn(`[assembleDeliverableCorpus/${label}] manifest path failed, legacy fallback:`, e?.message || e);
        }
        if (!corpus) {
            try { corpus = buildEvidenceCatalogBlock(this.rawSources, { deliverableName: label, minDistinctSources: opts.minDistinctSources ?? 8 }); } catch { corpus = ''; }
        }
        return ds ? `${ds}\n${corpus}` : corpus;
    }

    /**
     * 2026-06-09 DESIGN-SYSTEM PULL (the per-deliverable Figma-sourced design rule).
     * Every on-demand deliverable pulls its brand's design-system corpus from the wiki
     * (wiki/brand/{nxt|nu}/design-system.md - the manifest-retrievable mirror of the
     * Figma design system: exact color/type tokens, the font-role contract, and the
     * per-format dimensions HTML 960x540 16:9 / PPTX 13.33x7.5in / PDF Letter-A4) so the
     * composed artifact uses ACTUAL design-system elements at the correct dimensions.
     * Brand resolves from the prompt (#NU/#NXT/#northeastern); default NXT. Cached per brand.
     */
    private _designSystemCache: Record<string, string> = {};
    private async assembleDesignSystem(brandHint?: string): Promise<string> {
        let brandId = 'nxt';
        try {
            const { detectBrandFromText } = await import('../components/slideTemplates/brands');
            brandId = detectBrandFromText(`${brandHint || ''} ${this.goal || ''} ${this.approach || ''}`) || 'nxt';
        } catch { /* default nxt */ }
        if (this._designSystemCache[brandId]) return this._designSystemCache[brandId];
        const PROXY = (process.env.VITE_PROXY_URL as string) || 'http://127.0.0.1:5012';
        try {
            const resp = await fetch(`${PROXY}/api/wiki/read/brand/${brandId}/design-system.md`);
            if (resp.ok) {
                const data: any = await resp.json().catch(() => null);
                const body = (data && (data.content || data.body || data.text)) || (typeof data === 'string' ? data : '');
                if (body && body.length > 0) {
                    let block = `=== ${brandId.toUpperCase()} DESIGN SYSTEM (use these EXACT tokens, font roles, and per-format dimensions in the artifact) ===\n${body}\n`;
                    // 2026-06-09 - append the SHARED element-twins (HTML preview + PPTX twin per element)
                    // and the Figma node map so the composer pulls ACTUAL design-system elements and the
                    // self-improvement loop can resolve element-name -> live Figma node id.
                    for (const shared of ['element-twins.md', 'deliverable-atomic-model.md', 'figma-node-map.md', 'logos.md']) {
                        try {
                            const r2 = await fetch(`${PROXY}/api/wiki/read/brand/${shared}`);
                            if (r2.ok) {
                                const d2: any = await r2.json().catch(() => null);
                                const b2 = (d2 && (d2.content || d2.body || d2.text)) || (typeof d2 === 'string' ? d2 : '');
                                if (b2 && b2.length > 0) block += `\n${b2}\n`;
                            }
                        } catch { /* non-fatal */ }
                    }
                    block += `=== END DESIGN SYSTEM ===\n`;
                    this._designSystemCache[brandId] = block;
                    console.log(`[assembleDesignSystem] pulled ${brandId} design system + element twins + node map (${block.length} chars)`);
                    return block;
                }
            }
            console.warn(`[assembleDesignSystem] wiki/brand/${brandId}/design-system.md unavailable - artifact uses in-code brand tokens`);
        } catch (e: any) {
            console.warn('[assembleDesignSystem] failed (non-fatal):', e?.message || e);
        }
        return '';
    }

    private async getGoalEvidenceBlock(): Promise<string> {
        // Reuse the cached pack only if it's non-empty. Empty result = retry
        // on next call.
        if (this.goalEvidencePackPromise && this.goalEvidenceCachedNonEmpty) {
            return this.goalEvidencePackPromise;
        }
        this.goalEvidencePackPromise = (async () => {
            try {
                const { retrieveGoalRelevantEvidence, describeRetrievalStats } = await import('./notebookRetrieval');
                // 2026-05-20 - Budget raised: 40→120 chunks, 4K→7K chars/article.
                // On 14-source corpora with ~600 evidence chunks, 40 left ~85%
                // of indexed evidence untouched. Themes/personas/strategies
                // were synthesizing from a thin slice. With 1M-token models
                // (Gemini 3.1 Pro, Opus 4.7) this is still <25% of context.
                const pack = await retrieveGoalRelevantEvidence(this.goal, {
                    limit: 120,
                    maxCharsPerArticle: 7000,
                    minChars: 500,
                    goalBlendWeight: 1.0,
                });
                if (pack.stats.retrieved === 0) {
                    console.warn(`[NotebookLM] no goal-relevant chunks retrieved for "${this.goal.slice(0, 60)}..." - will retry on next artifact call`);
                    this.goalEvidenceCachedNonEmpty = false;
                    return '';
                }
                this.goalEvidenceCachedNonEmpty = true;
                console.log(`[NotebookLM] goal-evidence pack: ${describeRetrievalStats(pack)}`);
                // Phase 1 corpus-identity: personas/themes/recs quote VERBATIM from
                // this pack, so it must be part of the verification corpus.
                this.registerGroundingText(pack.promptBlock);
                return pack.promptBlock;
            } catch (err: any) {
                console.warn('[NotebookLM] retrieval skipped - will retry on next artifact call:', err?.message || err);
                this.goalEvidenceCachedNonEmpty = false;
                return '';
            }
        })();
        return this.goalEvidencePackPromise;
    }

    /** Invalidate the cached evidence pack - call when the research goal
     *  changes mid-session (rare) or when new sources are ingested. */
    invalidateGoalEvidence(): void {
        this.goalEvidencePackPromise = null;
        this.goalEvidenceCachedNonEmpty = false;
        this.substrateEvidencePromise = null;
        this.substrateEvidenceCachedNonEmpty = false;
    }

    // 2026-06-05 (Step 5, volume-to-insight) - SUBSTRATE EVIDENCE BLOCK.
    // Parallel to getGoalEvidenceBlock() (single-angle wiki retrieval) but
    // sourced from the multi-angle /api/corpus/retrieve substrate endpoint.
    // Both blocks are injected together in executeStep / executeStepViaGPT /
    // _runBreadthPass so EVERY consumer (themes, personas, journey, roadmap,
    // recommendations, gap, PRD, blueprint, tech-arch, tech-audit,
    // competitive, strategic-report) sees a coverage-spanning evidence set
    // in addition to the focus-narrowed goal-evidence pack. NotebookLM
    // Pattern 4 (round-robin merge across 6 fixed deterministic angles)
    // ensures the set SPANS the semantic neighborhood instead of
    // over-representing one cluster. Determinism: fixed angle templates +
    // stable merge -> same goal -> same block across runs.
    private substrateEvidencePromise: Promise<string> | null = null;
    private substrateEvidenceCachedNonEmpty: boolean = false;

    private async getSubstrateEvidenceBlock(): Promise<string> {
        if (this.substrateEvidencePromise && this.substrateEvidenceCachedNonEmpty) {
            return this.substrateEvidencePromise;
        }
        this.substrateEvidencePromise = (async () => {
            try {
                const { prefetchSubstrateForDeliverable } = await import('./corpusSubstrate');
                const engagementSlug = (typeof window !== 'undefined'
                    ? (window as any).__hicCurrentEngagementSlug
                    : undefined) || undefined;
                const pre = await prefetchSubstrateForDeliverable({
                    consumer: 'session',
                    goal: this.goal,
                    engagement: engagementSlug,
                    angles: 6,
                    perAngle: 6,
                    maxTotal: 18,
                    maxCharsPerArticle: 6500,
                });
                if (pre.starved || !pre.block) {
                    console.warn(`[Substrate] no coverage articles for "${this.goal.slice(0, 60)}..." - will retry on next artifact call`);
                    this.substrateEvidenceCachedNonEmpty = false;
                    return '';
                }
                this.substrateEvidenceCachedNonEmpty = true;
                console.log(`[Substrate] coverage block: ${pre.articles.length} articles across ${pre.angles.length} fixed angles`);
                return pre.block;
            } catch (err: any) {
                console.warn('[Substrate] retrieval skipped - will retry on next artifact call:', err?.message || err);
                this.substrateEvidenceCachedNonEmpty = false;
                return '';
            }
        })();
        return this.substrateEvidencePromise;
    }

    constructor(goal: string, approach: string, selectedOutputs: OutputOption[] = [], lensPromptSegment: string = '', wikiKnowledge: string = '') {
        if (!process.env.API_KEY) throw new Error("API Key Missing");
        this.goal = goal;
        this.approach = approach || "Standard Ethnographic Analysis";
        this.selectedOutputs = selectedOutputs;
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Import consulting frameworks dynamically
        let frameworkInstructions = '';
        try {
            const { DELIVERABLE_FRAMEWORKS } = require('./deliverableFrameworks');
            const frameworkMap: Record<string, string> = {
                'PERSONAS': 'PERSONAS', 'STRATEGY_DECK': 'DECK_STRUCTURE',
                'JOURNEY_MAP': 'JOURNEY_MAP', 'PRD': 'PRD', 'ROADMAP': 'ROADMAP',
                'STRATEGIC_RECS': 'RECOMMENDATIONS', 'GAP_ANALYSIS': 'GAP_ANALYSIS',
                'TECH_AUDIT': 'TECH_AUDIT', 'COMPETITIVE_ANALYSIS': 'COMPETITIVE_ANALYSIS',
                'TECH_ARCH': 'TECH_ARCHITECTURE',
            };
            const activeFrameworks = selectedOutputs
                .map(o => frameworkMap[o])
                .filter(Boolean)
                .map(key => DELIVERABLE_FRAMEWORKS[key])
                .filter(Boolean);
            if (activeFrameworks.length > 0) {
                frameworkInstructions = '\n\nCONSULTING FRAMEWORKS FOR SELECTED DELIVERABLES:\n' + activeFrameworks.join('\n\n---\n\n');
            }
        } catch (e) { /* frameworks optional */ }

        // E1 (2026-07-02): cache-aligned assembly - static core first, engagement block after the
        // cache-break marker (the proxy turns the marker into an Anthropic cache breakpoint; other
        // providers strip it). The static core must contain NOTHING engagement-varying.
        const systemInstruction = `
            You are an elite CX consulting partner (McKinsey/BCG/IDEO caliber) powered by advanced AI and a persistent, compounding knowledge architecture.

            CORE OBJECTIVE: Produce consulting-grade deliverables from research evidence.
            (The research goal, analysis approach, lens, frameworks, and compiled wiki knowledge for
            THIS engagement are in the ENGAGEMENT CONTEXT block at the end of this system prompt.)

            ANTI-SLOP LANGUAGE ENFORCEMENT:
            BANNED PHRASES (replace with specific, quantified language):
            "In today's rapidly evolving landscape" | "It's important to note" |
            "This is a game-changer" | "Leverage synergies" | "Best-in-class" |
            "Cutting-edge" | "Robust solution" | "Seamless integration" |
            "Holistic approach" | "Key takeaways" | "At the end of the day" |
            "Moving forward" | "Low-hanging fruit" | "Paradigm shift" |
            "Actionable insights" | "Deep dive" (when filler)
            REPLACE WITH: Specific data. Named frameworks. Quantified impact.

            NXT HUMANS DESIGN SYSTEM (for all visual output):
            Anti-slop business flat minimalism on a stark white canvas. Concrete colors, fonts, and
            sizes are NEVER invented here - they resolve from the live design tokens
            (/api/design-tokens; the renderer twins hydrate them). Restraint rules that always hold:
            a single brand accent used sparingly (<= 15% of any surface), NO gradients, NO shadows,
            NO 3D, NO organic shapes, NO pie charts, NO rounded corners > 4px, NO off-brand fonts or
            palettes. Every chart title is a CONCLUSION sentence, not a topic label.
            Source every data point. Y-axis starts at zero.

            JSON OUTPUT RULES:
            - ALWAYS output valid JSON. No markdown code fences, no trailing commas, no comments.
            - The "methodology" field should be 1-3 sentences (brief reasoning transparency).
            - For theme/ingestion steps: keep individual field values concise (under 60 words each).
            - For persona steps: generate COMPLETE, DETAILED output - personas require rich data across all fields. Do NOT truncate personas. Generate 4-6 fully populated personas.
            - For recommendation/roadmap steps: be thorough - every recommendation needs full detail.

            CRITICAL TRANSPARENCY AND CITATION RULES:
            - Streaming Reasoning: For every step, output a "methodology" string inside the JSON object.
            - Include [PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT] tags in the methodology.
            - CITATION REQUIREMENT: Every factual claim MUST cite its source using [CHUNK_XXX] format.
            - The research corpus contains items tagged as [CHUNK_001], [CHUNK_002], etc.
            - Each chunk header shows "SOURCE: [source name]" - use this source name when citing.
            - When generating themes: include full citation objects with sourceFile, sourceName, text, and url.
            - The "sourceName" field is CRITICAL - it MUST match the SOURCE header (e.g. "Industry Trade Press", "OpenAlex", "Reddit: r/<community>"). This is what humans read.
            - The "text" field MUST be a VERBATIM quote copy-pasted from the chunk (10-30 words exactly as written).
            - When generating persona pain points: cite the specific chunk AND source name that evidences each pain point.
            - When generating recommendations: cite the chunks that support each recommendation.
            - When generating deck slides: every slide quote field must contain a real verbatim quote with source attribution.
            - If a claim cannot be traced to a specific chunk, prefix it with "[No direct source]".
            - Prioritize claims from sources that MOST DIRECTLY address the research objective, regardless of source type.
${HIC_CACHE_BREAK}================================================================
=== ENGAGEMENT CONTEXT (this research run) ===
================================================================
            RESEARCH GOAL: "${this.goal}"
            ANALYSIS APPROACH: "${this.approach}"
            ${lensPromptSegment}
            ${frameworkInstructions}

            ${wikiKnowledge ? `
=== COMPILED KNOWLEDGE FROM WIKI (persistent, compounding) ===
The following knowledge has been compiled from the NXT Humans wiki layer.
This is NOT generated from scratch - it represents accumulated consulting
methodology, anti-patterns, benchmark data, and brand standards that have
been refined across multiple engagements. ALWAYS prefer this compiled
knowledge over re-deriving from training data.

${wikiKnowledge}
=== END WIKI KNOWLEDGE ===
            ` : ''}
        ${getActiveConstraints()}`;

        this.chatSession = this.ai.chats.create({
            model: 'gemini-3.5-flash',
            config: {
                // direct Gemini SDK path: the cache-break marker is Anthropic-proxy-only - strip it.
                systemInstruction: stripCacheMarkers(systemInstruction),
                temperature: 0.1, // Low temperature for higher structural stability
            }
        });
        // Cache for the Claude fallback path
        this.systemInstructionCached = systemInstruction;
    }

    async updateContext(contextLabel: string, data: any): Promise<void> {
        // Token budget protection: send a COMPACT summary instead of full JSON.
        // Full JSON per stage can be 50-100KB. After 8 stages + step responses,
        // the accumulated chat history would exceed Gemini's 1M token limit.
        // Cap at 8KB per update - enough for the model to track edits.
        const fullJson = JSON.stringify(data);
        let contextPayload: string;
        if (fullJson.length <= 8000) {
            contextPayload = fullJson;
        } else {
            // Build a compact summary: key counts + first items + truncated content
            const summary: Record<string, any> = {};
            if (data && typeof data === 'object') {
                for (const [key, val] of Object.entries(data)) {
                    if (Array.isArray(val)) {
                        summary[key] = `[${val.length} items] ${JSON.stringify(val.slice(0, 2)).substring(0, 2000)}...`;
                    } else if (typeof val === 'string' && val.length > 500) {
                        summary[key] = val.substring(0, 500) + `... (${val.length} chars total)`;
                    } else {
                        summary[key] = val;
                    }
                }
            }
            contextPayload = JSON.stringify(summary).substring(0, 8000);
        }
        const prompt = `CONTEXT UPDATE: The user has reviewed/edited the ${contextLabel}. Summary of current state (use as ground truth for future steps):\n\n${contextPayload}`;
        await withRetry(() => this.chatSession.sendMessage({ message: prompt }), 3, 1000, "Context Update");
        // Mirror into accumulated context for Claude fallback path. Keep only
        // the latest snapshot per label (newer updates supersede older ones).
        const existing = this.accumulatedContext.findIndex(c => c.label === contextLabel);
        if (existing >= 0) {
            this.accumulatedContext[existing] = { label: contextLabel, payload: contextPayload };
        } else {
            this.accumulatedContext.push({ label: contextLabel, payload: contextPayload });
        }
    }

    async restore(
        ingestion: StepResult_Ingestion | null,
        themes: StepResult_Themes | null,
        personas: StepResult_Personas | null,
        structure: StepResult_Structure | null
    ): Promise<void> {
        const contextPayload = {
            instruction: "SYSTEM RESTORE: Resuming session. Use this established data.",
            researchContext: ingestion ? { summary: ingestion.summary } : "Pending",
            establishedThemes: themes ? themes.themes : "Pending",
            establishedPersonas: personas ? personas.personas : "Pending",
            establishedStructure: structure ? structure.slides : "Pending"
        };
        
        try {
            const schema: Schema = { type: Type.OBJECT, properties: { status: { type: Type.STRING } } };
            await this.chatSession.sendMessage({
                message: [{ text: JSON.stringify(contextPayload) }],
                config: { responseMimeType: "application/json", responseSchema: schema }
            });
        } catch (e) {
            console.warn("Session restore warning:", e);
        }
    }

    async ingestContext(files: FileUpload[], onStream: (t: string) => void): Promise<StepResult_Ingestion> {
        const fileParts: any[] = [];
        files.forEach((file, index) => {
            fileParts.push({ text: `--- FILE ${index + 1}: "${file.name}" ---` });
            const mimeType = file.type.toLowerCase();
            const extension = file.name.split('.').pop()?.toLowerCase();
            // Supported as binary inline data by Gemini
            const isSupportedInline = mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType.startsWith('video/');
            // Text files that can be decoded from Base64
            const isTextBased = (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/csv' || ['txt', 'md', 'json', 'csv'].includes(extension || '')) && !['doc', 'docx', 'pdf', 'bin', 'zip', 'exe'].includes(extension || '');
            // DOCX/DOC/XLSX: Office documents that Gemini can't inline but contain critical client data
            const isOfficeDoc = ['doc', 'docx', 'xlsx', 'xls', 'pptx', 'ppt'].includes(extension || '') ||
                mimeType.includes('officedocument') || mimeType.includes('msword') || mimeType.includes('ms-excel');

            if (isTextBased) {
                try {
                    fileParts.push({ text: atob(file.data) });
                } catch (e) {
                    fileParts.push({ text: `[Error: Content omitted for ${file.name}]` });
                }
            } else if (isSupportedInline) {
                // Send as binary for Gemini's native processing
                fileParts.push({ inlineData: { mimeType: file.type, data: file.data } });
                // For PDFs: ALSO try to extract readable text as backup
                // Gemini's PDF parsing can miss content in complex layouts
                if (extension === 'pdf') {
                    try {
                        const raw = atob(file.data);
                        // Extract text streams from PDF binary (captures most plaintext content)
                        const textMatches: string[] = [];
                        // PDF text is often between BT and ET operators, or in parentheses after Tj/TJ
                        const readable = raw.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, ' ');
                        // Find sequences of readable words (5+ chars of actual text)
                        const wordBlocks = readable.match(/[A-Za-z][A-Za-z0-9\s,.;:!?'-]{20,}/g);
                        if (wordBlocks && wordBlocks.length > 5) {
                            const extractedText = wordBlocks.join(' ').substring(0, 30000);
                            fileParts.push({ text: `\n[BACKUP TEXT EXTRACTION FROM ${file.name} - ensuring no content is missed by binary parsing:]\n${extractedText}` });
                        }
                    } catch (e) { /* Binary extraction failed, rely on inline data */ }
                }
            } else if (isOfficeDoc) {
                // Office documents: try to extract any readable text from the binary
                // DOCX files are ZIP archives containing XML. Raw Base64 decode often
                // captures enough readable text for the AI to work with.
                try {
                    const raw = atob(file.data);
                    // Extract text content between XML tags (captures document.xml content from DOCX)
                    const textContent = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Replace non-printable chars
                        .replace(/\s{3,}/g, ' ')  // Collapse multiple spaces
                        .replace(/<[^>]+>/g, ' ')  // Strip XML tags
                        .replace(/\s{2,}/g, ' ')   // Clean up again
                        .trim();
                    // Only use extracted text if it contains meaningful content (>200 chars of actual words)
                    const wordCount = textContent.split(/\s+/).filter(w => w.length > 3).length;
                    if (wordCount > 30) {
                        fileParts.push({ text: `[EXTRACTED TEXT FROM ${file.name} - Office document, partial extraction. Some formatting may be lost.]\n\n${textContent.substring(0, 50000)}` });
                    } else {
                        // Fallback: send as PDF-like inline data and hope Gemini can handle it
                        fileParts.push({ inlineData: { mimeType: 'application/pdf', data: file.data } });
                        fileParts.push({ text: `[NOTE: ${file.name} sent as binary document. If content appears garbled, the user should re-upload as PDF.]` });
                    }
                } catch (e) {
                    fileParts.push({ inlineData: { mimeType: 'application/pdf', data: file.data } });
                    fileParts.push({ text: `[NOTE: ${file.name} - Office document sent as binary. Content may need manual verification.]` });
                }
            } else {
                fileParts.push({ text: `[Unsupported file type: ${file.name}. Please convert to PDF or TXT for full content extraction.]` });
            }
        });

        // Count total sources for context
        const uploadedFileCount = files.filter(f => !f.name.startsWith('intelligence_sources_') && !f.name.startsWith('deep_research_')).length;
        const hasIntelligenceCorpus = files.some(f => f.name.startsWith('intelligence_sources_') || f.name.startsWith('deep_research_'));
        const totalFileCount = files.length;

        const prompt = `STEP 1: DEEP INGESTION AND CONTEXT SYNTHESIS.

You are performing the INGEST operation from a persistent knowledge architecture. Your job is NOT to skim - it is to deeply read, extract, and synthesize ALL provided evidence IN SERVICE OF THE USER'S RESEARCH OBJECTIVE.

THE USER'S RESEARCH OBJECTIVE:
"${this.goal}"

ANALYSIS APPROACH: ${this.approach}

Everything you read, extract, and synthesize must be evaluated through this lens: HOW DOES THIS EVIDENCE SERVE THE RESEARCH OBJECTIVE ABOVE? What does it reveal about the challenges, opportunities, stakeholders, and landscape relevant to this specific goal?

WHAT YOU HAVE RECEIVED:

PRIORITY 1 - CLIENT-UPLOADED DOCUMENTS (${uploadedFileCount} files):
These are the client's OWN materials - proposals, SOWs, transcripts, strategies, budgets.
They represent the SPECIFIC organizational context that no external source can provide.
READ THESE FIRST. READ EVERY PAGE. These define the project scope, stakeholders, goals,
constraints, and organizational reality. The client uploaded them because they are essential.
If the document is a proposal or SOW, extract: project scope, deliverables, timeline,
stakeholders, budget, strategic goals, and any specific organizational challenges mentioned.
DO NOT claim these documents are absent or missing - they are right here in the file list.

${hasIntelligenceCorpus ? `PRIORITY 2 - INTELLIGENCE CORPUS (from 100+ external sources):
Items tagged as [CHUNK_001], [CHUNK_002], etc. with source attribution.
These provide external context, benchmarks, industry trends, and evidence to COMPLEMENT
the client documents. Use them to validate, challenge, or enrich what the client documents say.` : ''}

Total files passed to you: ${totalFileCount}

YOUR TASK:
1. Read EVERY uploaded client document FIRST and THOROUGHLY - extract every detail about the project, stakeholders, goals, and constraints
2. Synthesize a comprehensive research context summary (what is this project about, what are the key challenges, what does the evidence reveal)
3. Identify ALL key stakeholders mentioned across ALL sources
4. Identify ALL data types present (proposals, transcripts, financial data, research papers, news articles, social data, etc.)
5. List ALL source documents including intelligence corpus items
6. CONFIDENCE ASSESSMENT (computed from actual evidence, not guessed):
   After reading ALL sources, score confidence based on these measurable factors:
   a) SOURCE BREADTH: How many distinct source types provided relevant data?
      (client docs, academic, news, government, social = 5 categories max)
   b) CONVERGENCE: How many key findings are confirmed by 2+ independent sources?
   c) SPECIFICITY: Does the evidence contain specific numbers, dates, names, and data points
      (vs vague generalities)?
   d) COVERAGE: How many dimensions of the research goal have direct evidence?
   e) FRESHNESS: What percentage of evidence is from the last 12 months?

   Score = average of these 5 factors, each on 0-100 scale.
   Report each factor individually so the user understands WHY the score is what it is.

7. SOURCE CONTRIBUTION RANKING: After analyzing everything, rank which source categories
   contributed the MOST valuable evidence to the research objective:
   - Which uploaded documents were most informative and why?
   - Which intelligence sources provided the strongest external validation?
   - Which sources were surprisingly relevant or irrelevant?
   This helps the self-improvement engine learn which sources to prioritize next time.

CITATION REQUIREMENT: Reference specific chunks [CHUNK_XXX] when describing key findings.
Cite chunks from across the FULL corpus range - not just the first 50.

Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                summary: { type: Type.STRING },
                dataTypesIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyStakeholders: { type: Type.ARRAY, items: { type: Type.STRING } },
                documents: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fileName: { type: Type.STRING }, author: { type: Type.STRING }, publicationDate: { type: Type.STRING } } } },
                confidenceScore: { type: Type.NUMBER },
                confidenceBreakdown: { type: Type.OBJECT, properties: {
                    sourceBreadth: { type: Type.NUMBER },
                    convergence: { type: Type.NUMBER },
                    specificity: { type: Type.NUMBER },
                    coverage: { type: Type.NUMBER },
                    freshness: { type: Type.NUMBER },
                } },
                reasoning: { type: Type.STRING },
                intelligenceSourceCount: { type: Type.NUMBER },
                topIntelligenceFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
                sourceContributionRanking: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    sourceCategory: { type: Type.STRING },
                    contributionLevel: { type: Type.STRING },
                    keyInsight: { type: Type.STRING },
                } } },
            },
            required: ["methodology", "summary", "dataTypesIdentified", "keyStakeholders", "documents", "confidenceScore"]
        };

        // Cache corpus parts for the two-pass theme architecture. The
        // chat session keeps them in its history (Flash, Pass-1 fallback);
        // the cached parts let us re-feed the same corpus into a one-shot
        // Gemini 3.1 Pro call (Pass-1 BREADTH) without re-parsing files.
        this.corpusFileParts = fileParts;
        this.corpusUploadedFileCount = uploadedFileCount;
        this.corpusHasIntelligence = hasIntelligenceCorpus;
        // U3 - capture the concatenated TEXT of the corpus (intelligence corpus +
        // text uploads; binary PDF/image parts are not verifiable) as the ground
        // truth for citation-faithfulness checks in generateThemes. Binary-only
        // corpora leave this short, in which case grounding fails-open (loudly).
        try {
            this.corpusGroundingText = fileParts
                .filter((p: any) => typeof p?.text === 'string')
                .map((p: any) => p.text)
                .join('\n');
        } catch { this.corpusGroundingText = ''; }

        // 2026-05-25 - ingestContext was the ONLY remaining synthesis call that used
        // raw executeStep instead of executeStepResilient. The live session aborted
        // the entire KG Auto-Synthesis chain when Gemini Flash repetition-collapsed
        // ("000000000000000050000000000000..." × 21). Now that ingest also goes
        // through the resilient runner, the same GPT-5.5 fallback path that
        // protects themes/personas/recs protects ingestion too.
        const result = await this.executeStepResilient<StepResult_Ingestion>(prompt, schema, fileParts, onStream, 'IngestContext');
        // Ensure arrays exist to prevent runtime errors
        if (!result.dataTypesIdentified) result.dataTypesIdentified = [];
        if (!result.keyStakeholders) result.keyStakeholders = [];
        if (!result.documents) result.documents = [];
        return result;
    }

    /**
     * 2026-05-30 - Domain-relevance gate for themes. cosine goalAlignment cannot
     * tell "AI for co-op job search" from "AI for design production" (both score
     * high on the shared "AI" buzzword), so a model judgment removes off-DOMAIN
     * themes the cosine scorer lets through. Returns the on-objective subset.
     * Failure-safe: returns the input unchanged on any error or if 0 would
     * survive (logs a hard warning rather than emptying - 0 survivors means the
     * COLLECTED corpus does not match the objective).
     */
    // Continuous objective-relevance helper, available to ranking + depth + display.
    // The SINGLE lever for theme selection (per owner directive 2026-06-08:
    // "the lever is the research objective relevance, not some arbitrary cap number").
    // Prefers the LLM-scored objectiveRelevance; falls back to the embedding-based
    // goalAlignment; finally a neutral 50 so an unscored theme is never silently cut.
    private _relevanceOf(t: any): number {
        if (typeof t?.objectiveRelevance === 'number') return t.objectiveRelevance;
        if (typeof t?.metadata?.objectiveRelevance === 'number') return t.metadata.objectiveRelevance;
        if (typeof t?.goalAlignment === 'number') return t.goalAlignment;
        return 50;
    }

    // 2026-06-08 - REPLACES the binary domain-relevance gate. The old gate CUT
    // themes keep/drop via one Flash call, and dropped on-objective co-op barriers
    // ("Visa Restrictions", "Financial Exclusion") that the user wanted. Per the
    // owner directive, relevance is a CONTINUOUS LEVER, not a cut: this scores EACH
    // theme 0-100 on objective relevance, writes it onto theme.objectiveRelevance,
    // and KEEPS EVERY THEME. Relevance then drives ranking, the in-deliverable
    // threshold, depth-enrichment order, and display order downstream. Nothing is
    // dropped here ("I want to see everything returned"); low-relevance themes
    // simply sink in the relevance ranking.
    private async _scoreThemesByObjectiveRelevance(themes: any[], onStream: (t: string) => void): Promise<any[]> {
        const cand = Array.isArray(themes) ? themes : [];
        if (!this.goal || cand.length < 2) return cand;
        try {
            const list = cand.map((t: any, i: number) =>
                `${i}. ${String(t.name || '').slice(0, 90)} - ${String(t.description || '').slice(0, 160)}`
            ).join('\n');
            // W2 — RELEVANCE RANKING CACHE (2026-06-28, model-usage-optimization
            // §2 W2). This is ALREADY a single BATCHED call (every candidate theme
            // scored in one request, not per-chunk), so W2(c) "batch N per call" is
            // a no-op here. The remaining win is caching: the call is deterministic
            // (temperature 0) over STABLE inputs (the theme list + research goal),
            // so the same corpus+goal re-run produces a BYTE-IDENTICAL request body.
            // Route it through the proxy `/api/ai/gemini` chokepoint (was a direct
            // @google/genai SDK call that bypassed the cache) so the proxy's
            // exact-match cache (shared sqlite, keyed on the full deterministic
            // body) HITS on re-run and skips the provider call. Fail-open: any proxy
            // error is caught by the surrounding try/catch and scoring is skipped.
            const _relevancePrompt = `RESEARCH OBJECTIVE: "${this.goal}"\n\n` +
                    `Score EACH candidate theme 0-100 on how directly it helps answer this research ` +
                    `objective. Use the FULL range:\n` +
                    `  90-100 = squarely on the objective's core subject AND problem.\n` +
                    `  60-89  = clearly relevant: a sub-aspect, driver, consequence, or affected ` +
                    `population of the objective.\n` +
                    `  30-59  = adjacent / transferable: a cross-industry ANALOGUE solving the SAME ` +
                    `underlying problem, or a related contextual factor. Analogues are VALUABLE evidence; ` +
                    `score them here, do NOT zero them.\n` +
                    `  1-29   = weakly related: shares only a buzzword or broad domain, little transferable lesson.\n` +
                    `  0      = genuinely irrelevant: a different problem in a different domain, no transferable lesson.\n` +
                    `Judge by SUBJECT and PROBLEM, not a shared buzzword (e.g. "AI"). Relevance is the ONLY ` +
                    `axis: do NOT penalize a theme for being single-source or thin. When uncertain, score HIGHER.\n\n` +
                    `THEMES:\n${list}\n\nReturn ONLY JSON: {"scores":[{"i":<index>,"r":<0-100>}]}`;
            const { callAIWithRetry } = await import('./aiRetryClient');
            const resp: any = await callAIWithRetry('gemini', {
                model: 'gemini-3.5-flash',
                contents: _relevancePrompt,
                // temperature 0 (deterministic) + JSON mode -> proxy exact-cache eligible.
                config: { temperature: 0, responseMimeType: 'application/json' },
            }, { label: 'themes:relevance-score (Gemini Flash)', maxAttempts: 2, requestTimeoutMs: 120_000 });
            // Synthesize the SDK `.text` convenience field from the proxy's raw
            // Gemini REST shape (candidates[0].content.parts[].text).
            if (resp && typeof resp.text !== 'string') {
                const _parts = resp?.candidates?.[0]?.content?.parts || [];
                resp.text = _parts.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text).join('\n');
            }
            recordDirectGeminiCall('themes:relevance-score', 'gemini-3.5-flash', resp);
            let txt = (resp.text || '').trim();
            if (txt.includes('```')) txt = txt.replace(/```json|```/g, '').trim();
            const pg = JSON.parse(txt);
            const scores: Record<number, number> = {};
            if (Array.isArray(pg?.scores)) {
                for (const s of pg.scores) {
                    const i = Number(s?.i), r = Number(s?.r);
                    if (Number.isInteger(i) && i >= 0 && i < cand.length && Number.isFinite(r)) {
                        scores[i] = Math.max(0, Math.min(100, r));
                    }
                }
            }
            let scored = 0;
            cand.forEach((t: any, i: number) => {
                if (scores[i] !== undefined) {
                    t.objectiveRelevance = scores[i];
                    t.metadata = { ...(t.metadata || {}), objectiveRelevance: scores[i] };
                    scored++;
                }
            });
            const core = cand.filter((t: any) => this._relevanceOf(t) >= 60).length;
            const adjacent = cand.filter((t: any) => { const r = this._relevanceOf(t); return r >= 30 && r < 60; }).length;
            console.log(`[Themes] objective-relevance scoring: scored ${scored}/${cand.length} (KEEP ALL); ${core} core (>=60), ${adjacent} adjacent (30-59). Relevance drives ranking + depth + in-deliverable threshold, NOT a count cap.`);
            if (typeof onStream === 'function') onStream(`[Themes] Scored ${scored} themes by objective relevance (${core} core, ${adjacent} adjacent); keeping ALL, ranked by relevance.`);
            return cand;
        } catch (e: any) {
            console.warn('[Themes] objective-relevance scoring skipped (non-fatal):', e?.message || e);
            return cand;
        }
    }

    async generateThemes(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Themes> {
        // Load Agent Skill for theme analysis
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('THEMES'); } catch (e) { /* skill unavailable */ }

        // 2026-05-12 - VS REVERTED for themes (Sprint 1 rollback).
        //
        // Verbalized Sampling was originally applied here to surface "non-
        // obvious tail themes". In practice, that produced 20 themes with 1
        // evidence each and 100% source concentration - thin slop, not real
        // themes. The bug was structural:
        //
        //   • VS forces probability < 0.10 ("anti-modal sampling")
        //   • Themes are EMPIRICAL CLUSTERS, defined by CONVERGENT evidence
        //     across multiple sources - the opposite of anti-modal
        //   • The downstream ranking `1/p × evidence_density` boosts rare-but-
        //     thin themes over convergent-but-modal ones (the 1/p multiplier
        //     outweighs evidence_density at low p)
        //   • Combined with k=24 + HARD FLOOR 12, the model invented themes
        //     from single mentions to hit the count at the right rarity
        //
        // VS stays in production for #recommendations, prototype Stage 1, and
        // html-deliverable layout/IA picks - surfaces where ideation is the
        // value proposition. Theme extraction is empirical, not creative.
        //
        // Verbalized Confidence (R1) stays - that's a different mechanic
        // (per-claim uncertainty surfacing, doesn't force tail sampling) and
        // remains correct for themes.

        // Tier B1 + B2 (2026-04-28) - multi-angle, cross-engagement archive
        // augmentation BEFORE constructing the theme prompt.
        //
        // The chat session's accumulated context only contains THIS engagement's
        // collected items; the wiki contains every prior engagement's archived
        // intelligence indexed in the chunked vector store. Goal-blended retrieval
        // (Phase 2.5) surfaces archive content the LLM would otherwise never see.
        //
        // B2 - multi-angle: instead of one goal-only retrieval, decompose the
        // goal into 3-4 conceptual angles and fetch goal-fit chunks per angle
        // in parallel. Dedupe by article_id, concatenate into the archive block.
        // Effect: each angle hits a different semantic neighborhood, so total
        // archive coverage is ~2-3x what a single retrieval would surface.
        let archiveBlock = '';
        // Phase 2 MCR - the archive augmentation bulk-injects cross-engagement
        // article BODIES (the BANNED pattern) and fires live /api/wiki/fetch-
        // articles even in cached-only mode (the Phase 4 intent-b violation).
        // When the chunk-pointer contract is active, the engagement's own pinned
        // chunks ARE the corpus, so skip the archive bulk entirely.
        if (!this.useMcrCorpus) try {
            const { fetchWikiArticles } = await import('./wikiIndexService');

            // Generate 3-4 research angles from the goal. Falls back to
            // [goal] on any failure - we still get B1's behavior.
            let angles: string[] = [];
            try {
                const angleResp = await this.ai.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: `Given the research goal below, generate 3-4 DISTINCT conceptual angles
that together cover the goal's full semantic neighborhood. Each angle should
be a 4-10 keyword search query that would surface a different facet of the
research. Different angles must explore DIFFERENT aspects (not paraphrases
of each other).

GOAL: "${this.goal}"

Return ONLY a JSON array of strings. Example:
["customer engagement digital channels 2025 2026",
 "buyer lifecycle CRM technology mid-market",
 "Gen Z purchasing behavioral trends",
 "operations workflow automation"]

NO commentary, NO markdown, JUST the JSON array.`,
                    config: { temperature: 0.4 },  // slight diversity for angle variety
                });
                recordDirectGeminiCall('themes:angles', 'gemini-3.5-flash', angleResp);
                let txt = angleResp.text || '[]';
                if (txt.includes('```json')) txt = txt.split('```json')[1].split('```')[0].trim();
                else if (txt.includes('```')) txt = txt.split('```')[1].split('```')[0].trim();
                const parsed = JSON.parse(txt);
                if (Array.isArray(parsed)) {
                    angles = parsed.filter(s => typeof s === 'string' && s.trim().length > 0).slice(0, 4);
                }
            } catch (e: any) {
                // P0.4 - surface the fallback so the user sees that multi-angle
                // retrieval was skipped (theme breadth may be reduced).
                const msg = e?.message || String(e);
                console.warn('[generateThemes] angle generation failed:', msg);
                if (typeof onStream === 'function') {
                    onStream(`[Themes] Multi-angle retrieval unavailable (${msg.slice(0, 100)}); using single-angle goal as fallback. Theme breadth may be reduced.`);
                }
            }
            if (angles.length === 0) angles = [this.goal];
            // 2026-05-30 - Always LEAD with the raw research objective as a broad
            // angle. The LLM-decomposed angles are frequently too narrow (on the
            // AI-design corpus, 2 of 4 returned 0 archive hits), whereas the broad
            // objective query reliably surfaces the on-objective archive content
            // the in-session collection missed. This is the evidence slice theme
            // synthesis MUST anchor to, so it leads and gets the largest budget.
            {
                const broadGoal = (this.goal || '').slice(0, 300).trim();
                if (broadGoal) angles = [broadGoal, ...angles.filter(a => a.trim() !== broadGoal)].slice(0, 5);
            }
            console.log(`[generateThemes] multi-angle retrieval: ${angles.length} angles`,
                angles.map(a => a.slice(0, 60)));

            // Fetch goal-fit chunks per angle in parallel. Each angle is the
            // primary query; the engagement goal biases ranking via Phase 2.5
            // blended retrieval (weight 0.40 - angle dominates, goal scaffolds).
            //
            // 2026-05-23 - Per-angle timeout raised 8s → 25s. After the
            // Phase-2 chunk store rebuild at 25K chunks, the FIRST cold
            // query against sqlite-vec takes 3-6s; 8s was too tight and
            // ALL four angles intermittently timed out, silently zeroing
            // the archive block. With 25s we tolerate cold-cache warmup
            // while still failing fast when the proxy is truly down.
            const PER_ANGLE_LIMIT = angles.length === 1 ? 40 : 22;
            const angleTimings: Array<{ angle: string; ms: number; count: number }> = [];
            const perAngleResults = await Promise.all(
                angles.map(async (angle) => {
                    const t0 = Date.now();
                    try {
                        const result = await Promise.race([
                            fetchWikiArticles({
                                query: angle,
                                engagementGoal: this.goal,
                                // 2026-06-05 - Bug 2: bumped goalBlendWeight 0.40 → 0.55
                                // so the current goal dominates angle-query in retrieval
                                // ranking, reducing pull-in of off-objective prior-
                                // engagement artifacts. The single-angle fallback case
                                // (1.0) is unchanged.
                                goalBlendWeight: angles.length === 1 ? 1.0 : 0.55,
                                limit: PER_ANGLE_LIMIT,
                                maxCharsPerArticle: 7000,
                                minChars: 500,
                                // 2026-06-05 - Bug 2: filter out kind='upload' so prior
                                // engagements' client PDFs (alumni, fundraising, billing)
                                // don't pollute the current engagement's theme breadth.
                                // Articles + transcripts + synthesis (where opted in)
                                // remain eligible; only uploaded client docs are blocked
                                // on this specific cross-engagement retrieval path.
                                excludeUploads: true,
                            }),
                            new Promise<any[]>(resolve => setTimeout(() => resolve([]), 25000)),
                        ]);
                        const ms = Date.now() - t0;
                        angleTimings.push({ angle: angle.slice(0, 60), ms, count: Array.isArray(result) ? result.length : 0 });
                        return result;
                    } catch {
                        const ms = Date.now() - t0;
                        angleTimings.push({ angle: angle.slice(0, 60), ms, count: 0 });
                        return [] as any[];
                    }
                })
            );

            // Dedupe by article_id (or wikiPath). Best score across angles wins.
            const byId: Record<string, any> = {};
            for (const arr of perAngleResults) {
                if (!Array.isArray(arr)) continue;
                for (const a of arr) {
                    const key = a.id || a.wikiPath;
                    if (!key) continue;
                    if (!byId[key]) byId[key] = a;
                }
            }
            const archived = Object.values(byId);

            // Always log per-angle timing + counts so a silent zero-archive
            // situation surfaces in console instead of disappearing into the
            // "[Themes] Pass 1 BREADTH (Pro) returned 1 themes" mystery.
            if (angleTimings.length > 0) {
                const summary = angleTimings.map(t => `"${t.angle}" → ${t.count} articles in ${t.ms}ms`).join(' | ');
                const totalArchived = archived.length;
                if (totalArchived === 0) {
                    console.warn(`[generateThemes] archive augmentation produced 0 articles across ${angles.length} angles. ${summary}. Pass 1 BREADTH will run on in-session corpus only - theme breadth may suffer.`);
                } else {
                    console.log(`[generateThemes] archive angle timing: ${summary} → ${totalArchived} unique articles after dedupe`);
                }
            }

            // 2026-06-05 (Step 5, volume-to-insight) - STARVATION FALLBACK.
            // The LLM-decomposed angles can return 0 articles when they're too
            // narrow OR when every angle hits the 25s per-angle timeout (cold
            // sqlite-vec cache). Before giving up, fire ONE deterministic
            // /api/corpus/retrieve pass - it uses 6 fixed templates
            // (goal, challenges, evidence, examples, stakeholders, contradictions)
            // and the same fetch-articles primitive, so it surfaces archive
            // content whenever any of those 6 framings has goal-fit chunks.
            // Determinism: fixed templates + stable merge -> reproducible.
            if (archived.length === 0) {
                try {
                    const { retrieveCoverage, recordYieldEvent } = await import('./corpusSubstrate');
                    const sub = await retrieveCoverage({
                        goal: this.goal,
                        angles: 6,
                        per_angle: 8,
                        max_total: 30,
                        maxCharsPerArticle: 7000,
                    });
                    const subArts = sub.articles || [];
                    recordYieldEvent({
                        consumer: 'themes.archive-aug.fallback',
                        goal: (this.goal || '').slice(0, 80),
                        scope_size: sub.scoped_in,
                        retrieved: subArts.length,
                        note: subArts.length === 0
                            ? 'substrate fallback also returned 0 - corpus has no goal-fit archive content'
                            : `substrate fallback recovered ${subArts.length} articles after LLM-angle starvation`,
                    });
                    if (subArts.length > 0) {
                        for (const a of subArts) {
                            const key = a.id || a.wikiPath;
                            if (key && !byId[key]) byId[key] = a;
                        }
                        const recovered = Object.values(byId);
                        archived.length = 0;
                        archived.push(...recovered);
                        console.log(`[generateThemes] starvation fallback (substrate) recovered ${recovered.length} articles via ${sub.angles.length} fixed angles`);
                        if (typeof onStream === 'function') {
                            onStream(`[Themes] Substrate fallback recovered ${recovered.length} archive articles after the LLM-angle retrieval returned 0. Determinism preserved (6 fixed templates).`);
                        }
                    }
                } catch (e: any) {
                    console.warn('[generateThemes] substrate fallback failed:', e?.message || e);
                }
            }

            // 2026-06-05 - Yield-ledger emission for the SUCCESSFUL path too.
            try {
                const { recordYieldEvent } = await import('./corpusSubstrate');
                recordYieldEvent({
                    consumer: 'themes.archive-aug',
                    goal: (this.goal || '').slice(0, 80),
                    retrieved: archived.length,
                    note: archived.length === 0
                        ? 'starvation: 0 articles after LLM-angles + substrate fallback'
                        : `coverage: ${archived.length} articles across ${angles.length} LLM-angles`,
                });
            } catch { /* non-fatal */ }

            if (archived.length > 0) {
                const blocks: string[] = [];
                let totalChars = 0;
                const ARCHIVE_BUDGET = 220_000;  // ~55K tokens - objective-relevant archive is PRIMARY evidence for themes; give it enough room to counterweight the raw in-session corpus
                for (let i = 0; i < archived.length; i++) {
                    const a: any = archived[i];
                    const matched = Array.isArray(a.matched_chunks) && a.matched_chunks.length > 0
                        ? a.matched_chunks.map((c: any) => c.text).join('\n---\n')
                        : (a.content || '').slice(0, 7000);
                    if (!matched.trim()) continue;
                    const header = `[ARCHIVE_${String(i + 1).padStart(3, '0')}] ${a.title || a.source || 'Untitled'}` +
                        `${a.source ? ` · Source: ${a.source}` : ''}` +
                        `${a.date ? ` · ${a.date}` : ''}` +
                        `${a.url ? `\nURL: ${a.url}` : ''}`;
                    const block = `${header}\n${matched}\n`;
                    if (totalChars + block.length > ARCHIVE_BUDGET) break;
                    blocks.push(block);
                    totalChars += block.length;
                }
                if (blocks.length > 0) {
                    archiveBlock = `=== CROSS-ENGAGEMENT WIKI ARCHIVE - goal-fit passages from ${angles.length} research angles ===
The following ${blocks.length} passages were retrieved from prior engagements'
archived research via ${angles.length}-angle parallel goal-fit retrieval (Phase 2.5
blended embedding). They span the corpus's full semantic neighborhood for
this research objective and represent SIGNAL the in-session collection alone
would not surface.

Treat these chunks as FIRST-CLASS EVIDENCE - they are part of the corpus you
analyze. They have ARCHIVE_NNN identifiers (cite as sourceFile) distinct from
the in-session CHUNK_NNN identifiers.

ANGLES THAT INFORMED THIS RETRIEVAL:
${angles.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

${blocks.join('\n')}
=== END WIKI ARCHIVE ===

`;
                    console.log(`[generateThemes] archive: ${blocks.length} passages, ${(totalChars / 1024).toFixed(1)}KB across ${angles.length} angles`);
                    // Phase 1 corpus-identity: theme quotes are drawn from these
                    // archive passages, which are NOT in the ingestion fileParts.
                    // Register them so theme grounding verifies against the real
                    // source text (closes the 6/58 grounding artifact).
                    this.registerGroundingText(blocks.join('\n'));
                }
            }
        } catch (err: any) {
            console.warn('[generateThemes] archive augmentation skipped:', err?.message || err);
        }

        // 2026-06-02 - CLUSTER GROUNDING. Resolve the deterministic topic clusters
        // (BERTopic-style) computed from the selected corpus and build a backbone
        // block the breadth model MUST account for. This closes the audited gap
        // where themes were pure-LLM and ignored the corpus's empirical cluster
        // structure. Bounded wait (90s) for an in-flight parallel topic job; fully
        // non-fatal - absent clusters just means no grounding block.
        let clusterBlock = '';
        try {
            let clusters = this.topicClusters;
            if (!clusters && this.topicClustersPromise) {
                clusters = await Promise.race([
                    this.topicClustersPromise.catch(() => null),
                    new Promise<null>(r => setTimeout(() => r(null), 90000)),
                ]);
                if (clusters) this.topicClusters = clusters;
            }
            const topics = Array.isArray(clusters?.topics) ? clusters.topics : [];
            if (topics.length > 0) {
                const lines = topics.slice(0, 30).map((t: any, i: number) => {
                    const terms = Array.isArray(t.top_terms) ? t.top_terms.slice(0, 8).join(', ') : '';
                    const sent = t.sentiment ? ` · sentiment: ${t.sentiment}` : '';
                    const n = (t.post_count != null) ? ` · ${t.post_count} docs` : '';
                    const sum = String(t.summary || '').replace(/\s+/g, ' ').slice(0, 200);
                    return `  CLUSTER ${i + 1}: ${t.name || 'unnamed'}${n}${sent}\n     terms: ${terms}\n     ${sum}`;
                }).join('\n');
                clusterBlock = `=== DETERMINISTIC TOPIC CLUSTERS (computed from YOUR selected corpus) ===
These ${topics.length} clusters are the EMPIRICAL backbone of the corpus - each is a group of documents that cluster together by meaning, with its top distinguishing terms and discussion sentiment. Your themes MUST account for this structure: every substantive cluster should be reflected in at least one theme. You MAY merge closely-related clusters or split a broad cluster into sharper themes, but do NOT ignore a populated cluster, and do NOT invent themes with no cluster or evidence support. Use the cluster terms and sentiment as evidence anchors; do not copy a cluster's term list as a theme name.
${lines}
=== END TOPIC CLUSTERS ===

`;
                console.log(`[generateThemes] grounding themes on ${topics.length} deterministic topic clusters`);
            }
        } catch (e: any) {
            console.warn('[generateThemes] cluster grounding unavailable (non-fatal):', e?.message || e);
        }

        // 2026-05-12 - R1 Verbalized Confidence (entropy proxy for the
        // Reinforcement-Inference trigger). Themes are the canonical corpus-
        // synthesis surface and the foundational input to every downstream
        // deliverable - they get the directive first as the calibration-gate
        // smoke test. If Gemini does not emit a calibrated high/medium/low
        // distribution here (the surface with the most genuine uncertainty),
        // the directive needs hardening before propagating to the other 14
        // sites in R1. See plans/reinforcement-inference-uplift.md.
        const vcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'theme synthesis',
            claimNoun: 'theme',
            claimNounPlural: 'themes',
            maxHighFraction: 0.60,
        });

        const prompt = `${vcDirective}\n${skillInstructions ? `=== AGENT SKILL: THEME ANALYST ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${clusterBlock}${archiveBlock}STEP 2: STRATEGIC THEME EXTRACTION. You are a senior research analyst performing rigorous thematic analysis.

RESEARCH OBJECTIVE: "${this.goal}"

METHODOLOGY: Perform MULTI-DIMENSIONAL thematic analysis across these 6 lenses. The lenses are a HEURISTIC for where to look - NOT a quota. EVERY lens that has multi-source evidence MUST yield themes. The corpus you receive is large; expect to find SUBSTANTIAL theme breadth across all six lenses. Aggregating distinct findings into umbrella themes is LAZY - split them apart.

1. POLICY & REGULATORY: Government actions, legislation, compliance requirements, regulatory shifts
2. TECHNOLOGY & INNOVATION: Tools, platforms, AI adoption, digital transformation, emerging tech
3. FINANCIAL & ECONOMIC: Funding, budgets, revenue models, costs, economic trends, ROI
4. STAKEHOLDER & HUMAN: People impacts, workforce, demographics, equity, culture, sentiment
5. STRATEGIC & COMPETITIVE: Market position, competition, partnerships, differentiation, growth
6. OPERATIONAL & PROCESS: Workflows, efficiency, service delivery, infrastructure, best practices

SOLUTION-NAMED THEMES ARE FORBIDDEN (HARD RULE - NON-NEGOTIABLE):
A theme is a FINDING - a pattern, tension, or condition the evidence reveals. It is NOT a product, feature, tool, initiative, or recommendation. NEVER name a theme after a thing to build or do.
   "Onboarding Assistant", "Partner Assistant", "Experience Builder", "Account Matchmaking", "Growth Crawler", "Predictive Routing Engine" (these are SOLUTIONS/FEATURES, not findings)
   Any noun phrase that names an app, platform, agent, tool, or program to deploy
   "Intake matching is fragmented across disconnected systems" (a finding/condition)
   "Customers distrust opaque automated decisions" (a tension the evidence shows)
   "Pre-purchase guidance is disjointed and manual" (a current-state pattern)
A theme names WHAT THE EVIDENCE SHOWS IS TRUE, never WHAT SOMEONE SHOULD BUILD. Solutions belong in the recommendations deliverable. A theme named like a product is INSTANTLY REJECTED.

META-THEMES ARE FORBIDDEN (HARD RULE - NON-NEGOTIABLE):
A theme describes a PATTERN OR FINDING FROM THE EVIDENCE. A meta-theme complains about the evidence itself. Meta-themes are INSTANTLY REJECTED.

FORBIDDEN theme names (these will be filtered out post-generation):
   "General industry news lacking subject focus"
   "Pervasive lack of quantified case studies"
   "Insufficient data for specific modernization benchmarking"
   "Anecdotal criticism of industry conferences for productivity"
   "Marketing claims versus quantified institutional outcomes" (if it describes what the corpus lacks, not what it shows)
   "Limited evidence on X" / "Scarcity of data on Y" / "Absence of Z"
   "Corpus dominated by [source type]" / "Underrepresentation of [topic]"

A meta-theme contains these patterns - reject before emission:
  • "lack of", "lacking", "absence of", "scarcity of", "insufficient", "missing", "limited evidence"
  • "anecdotal", "unquantified", "dominant headlines without body", "pervasive gaps"
  • "[X] news lacking [Y]", "[X] claims versus [Y] outcomes" (when contrasting corpus-provided vs corpus-missing)
  • References to the corpus, dataset, sources, or evidence base as the subject of the theme

ACCEPTABLE alternatives when a lens has thin evidence:
  • Skip the lens entirely (fewer themes is better than slop themes)
  • Request more data via the retrieval tool before manufacturing a theme
  • NEVER produce a theme that announces missing evidence to the reader - the output is a finished deliverable, not a QA annotation

HARD FLOOR: 12 themes minimum is REQUIRED for any corpus over 200 chunks. If you stop short of 12, you have NOT analyzed the full corpus - go back, scan the chunks you skipped, and find more themes. Output below floor will be rejected and you will be re-prompted with explicit instructions to extract more.

SOURCE DIVERSITY REQUIREMENT (critical):
Your corpus contains evidence from MULTIPLE source types. ALL sources start with EQUAL credibility - their value is determined by what they actually contribute to the research objective, not by where they came from. The corpus includes:
- CLIENT DOCUMENTS: Uploaded PDFs, proposals, SOWs, transcripts - the client's specific organizational context
- ACADEMIC PAPERS: OpenAlex, Crossref, Semantic Scholar, ERIC - peer-reviewed research
- NEWS & INDUSTRY: trade press, GDELT, industry blogs - current trends and developments
- GOVERNMENT DATA: Federal Register, Data.gov, official statistics portals - official statistics and policy
- SOCIAL/COMMUNITY: Reddit, forums - unfiltered practitioner sentiment and grassroots experience

EVIDENCE EVALUATION RULES:
- Judge EVERY source by its SPECIFIC CONTRIBUTION to the research objective, not its category
- A Reddit post from a frontline practitioner describing exactly the client's problem is MORE valuable than an academic paper on the topic from a different region
- An uploaded SOW detailing the client's budget and timeline is MORE valuable than 50 news articles about general industry trends
- The strongest themes have CONVERGENT evidence: multiple independent sources - regardless of type - pointing to the same finding
- Every theme MUST cite sources from at least 2 DIFFERENT source names (not just Reddit + Reddit)
- After extracting themes, mentally rank which sources ACTUALLY contributed the most - that's the real credibility assessment

EXTRACTION RULES - CORPUS-DENSITY BASED, NO HARD CEILING:
- Analyze EVERY chunk in the corpus - client docs, intelligence sources, AND social data
- Each chunk may support MULTIPLE themes. A single source can contribute to 3-5 themes.
- INSIGHTFUL TITLES (REQUIRED): a theme NAME must state the SPECIFIC TENSION, SHIFT, or FINDING - a complete insight a partner grasps from the title alone - NOT a bland category or a solution label.
     GENERIC BUCKET (banned): "Technology", "Customer Support", "Operational Challenges", "AI Adoption", "Data Integration", "Engagement"
     SOLUTION/PRODUCT NAME (banned): "Workflow AI", "Matchmaking Engine", "Ops Dashboard"
     INSIGHTFUL FINDING: "Manual data reconciliation consumes a third of the frontline team's week", "Customers distrust opaque automated decisions", "Frontline support collapses under a one-specialist-for-many ratio", "Prospects go silent after the final evaluation step"
    Name what the evidence reveals is TRUE and why it matters - the friction, the shift, or the stance. If the title could head two unrelated insights, it is too generic; sharpen it.
- Description: 3-5 sentences with specific data points, statistics, names, dates from the evidence
- Floor: 12 themes minimum (the analyst expects breadth across the 6 lenses).
- Target density: roughly ONE theme per 25-30 chunks of evidence the corpus contains.
    • 200-chunk corpus -> 8-10 themes per lens that has support, ~12-20 themes total
    • 500-chunk corpus -> 18-25 themes total
    • 1000-chunk corpus -> 35-45 themes total
    • 2000+-chunk corpus -> 60-90 themes total
- NO CEILING. If the corpus is rich enough to ground 50 distinct themes with ≥3 multi-source citations each, generate 50. If 80, generate 80. The downstream merge pass dedupes near-duplicates.
- Concreteness test (each theme must pass): "Could two unrelated insights both fit under this theme?" If YES, split into two themes. If NO, keep.
- Mark each theme as "priority" (strong multi-source evidence), "emerging" (moderate, 1-2 source types), or "weak" (single source type)

MANDATORY SOURCE COVERAGE - READ THE ENTIRE CORPUS:
The corpus is organized with Tier 1 sources (academic, government) FIRST, Tier 2 (news) SECOND, Tier 3 (community) LAST.
You MUST extract themes from ALL THREE tiers. Do NOT stop reading after the first 100 chunks.
Scan the ENTIRE corpus - check CHUNK numbers. If the corpus goes to CHUNK_400+, you must cite chunks from across the full range, not just CHUNK_001 through CHUNK_050.
A valid theme analysis has citations spread across: early chunks (CHUNK_001-100), middle chunks (CHUNK_100-300), AND late chunks (CHUNK_300+).
If all your citations are from the first 50 chunks, your analysis is INCOMPLETE - go back and read the rest.

CITATION REQUIREMENTS (non-negotiable):
- Each theme MUST cite 3+ chunks from at least 2 different source types
- "sourceFile" = CHUNK ID (e.g. "CHUNK_001") from corpus
- "text" = VERBATIM quote from that chunk (10-30 words, copy-pasted exactly)
- "url" = URL from the chunk metadata (appears after "URL:" in chunk header)
- "sourceName" = source name from the SOURCE header (e.g. "Industry Trade Press", "OpenAlex")
- "author" = author if present, empty string otherwise
- "publicationDate" = the published date on the chunk's provenance line ("published: YYYY-MM-DD") or its "Date:" line, empty string otherwise. Never infer it from the research goal.
- "quote" = the single BEST direct quote exemplifying this theme (with chunk reference)
- "isCrossDocument" = true if evidence spans 2+ different source names (this should be TRUE for most themes)

CRITICAL - EXTERNAL INTELLIGENCE DIVERSITY MANDATE:
The corpus contains UPLOADED CLIENT DOCUMENTS (3-10 PDFs) and EXTERNAL INTELLIGENCE (~200 articles from academic, news, government, social, AI sources).
- At least 50% of themes MUST be grounded primarily in EXTERNAL intelligence (not uploaded PDFs)
- At least 30% of ALL citations must come from external sources (Industry Trade Press, Reddit, OpenAlex, ERIC, Federal Register, arXiv, NIST, etc.)
- Uploaded documents provide organizational context. External intelligence provides evidence of trends, competition, and best practices.
- The STRONGEST themes weave both: external finding + client context alignment
- If you find yourself citing the same 4-5 uploaded PDFs for most themes, STOP and go read the CHUNK_XXX items from the intelligence_sources section of the corpus

ANTI-PATTERNS (these will be rejected):
- CLIENT-DOC DOMINANCE: More than 70% of citations referencing uploaded PDF filenames. The user included ~200 external articles - USE THEM.
- Themes derived ONLY from Reddit or social sources when academic/news data exists
- Generating only 1-2 themes from a corpus with 100+ chunks
- Generic theme names without specificity
- Descriptions that don't cite specific evidence
- Missing URLs when the chunk clearly has one
- WRITER COACHING (2026-09-11): a description that tells the downstream author how to structure or use the material ("the white paper's section can lean on...", "this supports the harnessed-execution section"). Describe the finding, never the deliverable.
- HEDGE PROMOTION: turning hedged source text ("or something", "I think", "maybe") or a social-only mention into a stated capability, named tool, or API. Keep it as a quoted practitioner recollection.
- ANALOGY AS FACT: describing the research subject's architecture or behavior with a chunk about a DIFFERENT product or organization. Name the other product and call it an analogy, or leave it out.
- DATE PROJECTION: assigning a month, year, "beta", or "as of" period to a capability that the cited chunk does not state. Dates come from the chunk's provenance line (published date), never from the research goal's window.
- All themes from the same source type (e.g., all from Reddit, ignoring academic papers)
- ECHO CHAMBER: Multiple themes restating the same finding instead of diverse findings from different source categories

PASS 1 OF 2 - BREADTH ONLY. THIS IS THE BREADTH PASS.

You are running the BREADTH stage of a two-pass consulting-grade theme architecture.
A separate DEPTH pass will run AFTER yours, fanning out per-theme to a different model
to populate sub-themes, organizing dimensions, contradictions, temporal arcs, and
implications. Your job in this pass is ONLY to maximize the count of distinct,
well-cited, evidence-grounded themes - NOT to enrich any single theme.

ONLY EMIT THESE FIELDS PER THEME:
  • name (specific, finding-grade - not a category label)
  • description (3-5 sentences with named entities, dates, statistics from the evidence)
  • quote (the single best verbatim quote, 10-30 words copy-pasted from a chunk)
  • citations[] (3+ entries spanning 2+ source names - sourceFile, text, url, sourceName, author, publicationDate)
  • isCrossDocument (true if 2+ different source names support the theme)
  • status ("priority" | "emerging" | "weak")
  • goalAlignment (INTEGER 0..100 - how directly the theme answers the research goal:
       100 = the theme IS what's being asked about
        80 = primary mechanism / driver
        60 = essential context but not the headline
        40 = adjacent / useful for triangulation
        20 = tangential.
       Be HONEST - this score gates depth enrichment downstream.)

DO NOT POPULATE depth fields (sub-themes, dimensions, contradictions, temporal arc,
implications). Those are owned by Pass 2. If you spend time on them you under-deliver
on breadth - the only metric that defines this pass's success.

GOAL ANCHORING - ABSOLUTE RULE (OVERRIDES BREADTH):
================================================================================
Before emitting ANY theme, ask: does this theme directly answer or substantively
inform the research goal? Score it on the goalAlignment rubric above.

GATE (two-stage):
  • PRIMARY ADMISSION (goalAlignment >= 60): always ship. These are headlines.
  • SECONDARY ADMISSION (goalAlignment 40-59, "adjacent / triangulation"):
    - ADMIT if your goalAlignment >= 60 set has FEWER than 8 themes
      AND the theme has >= 3 distinct-source citations supporting it.
    - DROP if your >= 60 set already has >= 8 themes AND the corpus is small.
    The downstream pipeline ranks (evidenceCount × goalAlignment / 100), so a
    well-cited 50-alignment theme still shows up but doesn't crowd the top.
  • TANGENTIAL (goalAlignment 0-39): never emit. Period.

WHY TWO STAGES: a single hard floor at 60 over-prunes on highly-focused
research goals (e.g., "Identify a co-op strategy" against a 600-article corpus).
The model conservatively scores everything at 50-59 and emits 1 theme. The
secondary gate keeps breadth when the primary set is thin while still respecting
relevance when the primary set is rich.

The research goal is the success function. But UNDER-EXTRACTION is also a
failure: returning 1 theme from a corpus that supports 12+ is worse than
returning 14 themes with 3 in the 50-59 tail (those tail themes will rank low
in the UI, harmlessly).

If your corpus contains substantial off-topic content (the retrieval layer cast too
wide a net), the right response is to emit FEWER themes that anchor cleanly to the
goal - not more themes that pad with adjacency. The HARD FLOOR of 12 themes assumes
a corpus that actually supports 12 on-topic themes. If yours doesn't, emit what's
defensible and signal the corpus problem in the methodology field.

SELF-CHECK BEFORE EMITTING:
- If your final list has FEWER than 8 themes, look back. Did you score things at
  50-59 that genuinely belong in the analysis? Re-grade and admit them under the
  secondary gate. Producing 1-5 themes from a 200+ chunk corpus is almost always
  a goalAlignment over-pruning error, not a real corpus problem.
================================================================================

BREADTH MAXIMIZATION RULES:
  • Re-read the ENTIRE corpus end-to-end (CHUNK_001 through the highest CHUNK_NNN).
  • Each chunk may support multiple themes. A single source can contribute to 3-5 themes.
  • If you can split an umbrella theme into 2-4 specific sub-patterns that each have
    their own multi-source citation backing, SPLIT IT. The Pass 2 model will recombine
    if appropriate; under-splitting cannot be recovered.
  • The corpus's own chunk count drives the floor (see EXTRACTION RULES above).
    1077 chunks => 35-45 themes minimum.

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                themes: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            quote: { type: Type.STRING },
                            citations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                                sourceFile: { type: Type.STRING },
                                text: { type: Type.STRING },
                                url: { type: Type.STRING },
                                sourceName: { type: Type.STRING },
                                author: { type: Type.STRING },
                                publicationDate: { type: Type.STRING }
                            }, required: ["sourceFile", "text"] } },
                            isCrossDocument: { type: Type.BOOLEAN },
                            status: { type: Type.STRING },
                            // 2026-04-29 - Two-pass architecture. Only goalAlignment
                            // stays in the breadth schema (cheap integer scoring during
                            // breadth extraction). Tier C depth fields (subThemes,
                            // dimensions, contradictions, temporalArc, implications)
                            // are populated in Pass 2 by Claude Opus 4.7 via
                            // _enrichThemesDepth, fanning out per-theme in parallel.
                            goalAlignment: { type: Type.NUMBER },
                            // 2026-05-12 - VS probability field removed.
                            // Themes are now convergent-evidence-driven, not
                            // tail-distribution-driven. See the rollback note
                            // at the top of generateThemes for the rationale.
                            // 2026-05-12 - R1 Verbalized Confidence. Per-theme
                            // self-assessment used as the entropy proxy for the
                            // Reinforcement-Inference trigger. Optional in the
                            // schema (legacy paths still work); calibration is
                            // enforced in the prompt directive, not the schema.
                            confidence: { type: Type.STRING },
                            confidenceRationale: { type: Type.STRING },
                        },
                        required: ["name", "description", "quote", "citations", "isCrossDocument"]
                    }
                },
                // 2026-05-12 - R1 Verbalized Confidence (deliverable envelope).
                // The model names the 1-3 themes it would expect senior pushback
                // on, plus an overall confidence rating and a specific rationale.
                // 2026-05-23 - R3 reinforceIfUncertain() / shouldReinforce() in
                // services/reinforcementInference.ts now reads this envelope
                // to decide whether to re-ask with the prior payload anchored
                // (anchored re-ask vs from-scratch).
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "themes"]
        };
        // 2026-04-29 - TWO-PASS CONSULTING-GRADE THEME ARCHITECTURE.
        // Pass 1 BREADTH: Gemini 3.1 Pro one-shot on the cached corpus parts,
        // breadth-only schema (no depth fields), fresh context window with
        // no chat-history anchoring. Falls back to chat-session Flash (with
        // its own Claude-fallback) if the Pro call fails for any reason.
        let result = await this._runBreadthPass(prompt, schema, onStream);
        if (!result.themes) result.themes = [];

        // 2026-05-23 - EARLY UNDER-EXTRACTION RETRY. If Pass 1 returns < 5
        // themes (extreme under-extraction), retry IMMEDIATELY with explicit
        // under-extraction feedback BEFORE the thick-evidence filter runs.
        // Without this early retry, a 1-theme result hits the thick-evidence
        // filter, gets dropped (because 1 isn't "thick"), falls back to the
        // original 1-theme set, then waits for the BREADTH FLOOR retry that
        // fires after filtering - costing an extra round-trip and one more
        // opportunity for things to go wrong. Catching very-low counts here
        // is cheap and reliable.
        const EARLY_RETRY_THRESHOLD = 5;
        if (result.themes.length > 0 && result.themes.length < EARLY_RETRY_THRESHOLD && !feedback) {
            console.warn(
                `[Themes] EARLY under-extraction (${result.themes.length} themes < ${EARLY_RETRY_THRESHOLD}). ` +
                `Re-running breadth pass with goal-alignment-gate-relaxation feedback before filters.`
            );
            const earlyReprompt = `Your previous extraction returned only ${result.themes.length} theme(s) - extreme under-extraction.

The most common cause is the goalAlignment HARD GATE pruning too aggressively. On focused research goals (e.g., "Identify a co-op strategy"), themes that score 50-59 ARE on-topic but get conservatively dropped, leaving 1-3 themes.

Re-do the extraction. APPLY THE SECONDARY GATE EXPLICITLY:
  • Re-read the entire corpus from CHUNK_001 through the highest chunk.
  • Re-grade themes with the two-stage gate. Admit goalAlignment 50-59 themes that have >= 3 distinct-source citations whenever your >= 60 set has < 8 entries.
  • Target at least 12 themes; if the corpus genuinely cannot support that, target the most defensible breadth you can with explicit goalAlignment scores so downstream ranking handles tail items correctly.

Now extract the FULL theme set. Do not under-emit again.`;
            try {
                // Phase 2 (broader retrieval): broaden=true so the early retry also sees a
                // widened evidence window, not just a re-prompt of the same narrow chunks.
                const earlyRetry = await this._runBreadthPass(earlyReprompt, schema, onStream, 'Themes-EarlyRetry', true);
                if (Array.isArray(earlyRetry?.themes) && earlyRetry.themes.length > result.themes.length) {
                    console.log(`[Themes] Early retry produced ${earlyRetry.themes.length} themes (was ${result.themes.length})`);
                    result = earlyRetry;
                    if (!result.themes) result.themes = [];
                } else {
                    console.warn(`[Themes] Early retry did not improve count (${earlyRetry?.themes?.length ?? 0} vs ${result.themes.length}). Keeping original; BREADTH FLOOR retry may still fire downstream.`);
                }
            } catch (earlyErr: any) {
                console.warn('[Themes] Early retry failed (non-fatal):', earlyErr?.message || earlyErr);
            }
        }

        // 2026-05-12 - R1 calibration inspection (themes are the
        // calibration-gate smoke test for the Verbalized Confidence directive).
        // Normalize the envelope first so malformed model output is dropped
        // silently rather than poisoning downstream consumers. Then log the
        // per-theme high/medium/low distribution. If the distribution collapses
        // to "high" across runs, the directive needs hardening before we
        // propagate it to the other 14 R1 sites. The snapshot is structured -
        // R4 will route it to the wiki uncertainty ledger; for now it is
        // console-only and read by humans during the smoke test.
        const normalizedAssessment = normalizeSelfAssessment((result as any).selfAssessment);
        if (normalizedAssessment) (result as any).selfAssessment = normalizedAssessment;
        else delete (result as any).selfAssessment;
        inspectCalibration('themes', result.themes as any[], normalizedAssessment, 0.60);

        // 2026-04-21 - META-THEME POST-FILTER. The prompt forbids meta-themes,
        // but models still occasionally manufacture them when evidence is thin.
        // This filter catches themes whose NAME describes what the corpus LACKS
        // rather than what it shows - "General higher ed news lacking
        // advancement focus", "Pervasive lack of quantified case studies",
        // "Insufficient data for X benchmarking", etc. Filtered themes are
        // dropped and logged; they never reach the KG or any deliverable.
        // 2026-04-22 TIGHTENED. Prior version triggered on bare "insufficient",
        // "limited coverage", "anecdotal" - which match legitimate domain
        // findings ("International Fundraising Constraints" was false-rejected
        // because its description contained "limited coverage"). Discriminator:
        // a theme is meta ONLY if a lack-word CO-OCCURS with an explicit
        // corpus-reference term within a ~80-char window. "Donors lack trust"
        // is a finding. "The corpus lacks donor data" is meta.
        const CORPUS_REFERENCE = /\b(the\s+)?(corpus|research\s+(corpus|sources?|articles?|data|evidence)|collected\s+(data|articles?|evidence|sources?)|this\s+(dataset|research|sample|universe)|our\s+(sources?|data|corpus)|the\s+(dataset|sample|articles?|feeds?)|sample\s+size|source\s+coverage|the\s+available\s+(evidence|data|articles?))\b/i;
        const LACK_WORD = /\b(lack(s|ing|ed)?|absence|scarcity|insufficient|limited|sparse|meager|thin|absent|missing|paucity|underrepresent\w*|unquantified|anecdotal|headlines?\s+without\s+body|evidence\s+gap)\b/i;
        const isMetaTheme = (t: any): boolean => {
            const text = `${t?.name || ''} ${t?.description || ''}`.trim();
            if (!text) return false;
            if (!LACK_WORD.test(text) || !CORPUS_REFERENCE.test(text)) return false;
            // Proximity check - the two patterns must co-occur within 80 chars
            for (const lackMatch of text.matchAll(new RegExp(LACK_WORD.source, 'gi'))) {
                const idx = lackMatch.index ?? -1;
                if (idx < 0) continue;
                const window = text.substring(Math.max(0, idx - 80), Math.min(text.length, idx + (lackMatch[0]?.length || 0) + 80));
                if (CORPUS_REFERENCE.test(window)) return true;
            }
            return false;
        };
        const beforeCount = result.themes.length;
        const rejected: string[] = [];
        result.themes = result.themes.filter((t: any) => {
            if (isMetaTheme(t)) {
                rejected.push(t.name || '(unnamed)');
                return false;
            }
            return true;
        });
        if (rejected.length > 0) {
            console.warn(`[Themes] Rejected ${rejected.length}/${beforeCount} meta-themes (complaints about the corpus, not findings): ${rejected.map(n => `"${n}"`).join(', ')}`);
        }

        // 2026-05-12 - THICK-EVIDENCE FILTER (replaces the prior VS-rank).
        //
        // Themes must be CONVERGENT patterns - multi-source, multi-citation.
        // The prompt rule "every theme MUST cite sources from at least 2
        // DIFFERENT source names" was being ignored under VS pressure (the
        // model preferred hitting the k=24 target over honoring the citation
        // rule). Now that VS is removed, we ALSO enforce the rule with teeth:
        // any theme with < 2 distinct sources OR < 2 total citations is
        // dropped. The remaining themes are the ones with actual convergent
        // evidence - what theme extraction is supposed to produce.
        //
        // Then we sort by evidence density (descending) so the highest-quality
        // themes appear first. No ranking by rarity - modal patterns are the
        // GOAL here.
        // 2026-05-24 - SIMPLIFIED (replaced the 4-tier relaxation policy that
        // was the SECOND iteration of this code). The first iteration silently
        // shipped unfiltered themes; the second iteration accepted single-source
        // themes to hit a count floor. Both violated the standing quality-first
        // rule. The architecture now matches what works in
        // internal-solutions-socialresearch/backend/util/BertTopic.py:
        // BERTopic with nr_topics="auto" + auto-scaled min_cluster_size already
        // produces 15-25 themes from a 200+ doc corpus naturally. The LLM
        // extraction here SUPPLEMENTS clustering; the count comes from the
        // corpus, not from policy.
        //
        // Quality gates (citation diversity, source diversity, evidence
        // density) are enforced by Stop hooks (validate_citations,
        // validate_source_diversity, validate_evidence, validate_theme_yield).
        // If the strict filter drops too many themes, the BREADTH FLOOR retry
        // below MUST recover - there is no silent fallback.
        //
        // 2026-05-24 - DELIVERABLE-AWARE THEME COUNT TARGETING.
        // The TOP_N cap depends on what this theme set FEEDS. A themes-only
        // deliverable can render 25 themes; a strategy section wants ~7; a
        // persona input wants ~5; a typical slide deck wants ~12. Auto-cap
        // wastes downstream rendering budget. Resolution:
        //   1. Explicit feedback parameter from caller (`themeCountTarget`)
        //   2. Inferred from output mode metadata (this.outputMode / deliverable type)
        //   3. Default to 25 for safety (themes-only is the broadest use case)
        // 2026-06-02 - The analyst-desk THEMES view is wall-to-wall and shows
        // EVERY thick theme (no slice); only downstream deliverables (deck /
        // persona / strategy) cap. So themes/themes_only target the full thick
        // set (60 = effectively uncapped; the thick-evidence filter + breadth
        // are the real governors of count, not this policy cap).
        const THEME_COUNT_BY_DELIVERABLE: Record<string, number> = {
            'themes_only': 60,
            'themes': 60,
            'strategy_section': 7,
            'strategy': 7,
            'persona_inputs': 5,
            'persona_set': 5,
            'slide_deck': 12,
            'deck': 12,
            'gap_analysis': 8,
            'roadmap_inputs': 10,
            'recommendation_inputs': 12,
        };
        const inferredDeliverableType = String(
            (this as any).outputMode || (this as any).deliverableType || 'themes'
        ).toLowerCase().replace(/-/g, '_');
        const explicitTarget = (this as any).themeCountTarget;
        const TOP_N = (typeof explicitTarget === 'number' && explicitTarget > 0 && explicitTarget <= 50)
            ? explicitTarget
            : (THEME_COUNT_BY_DELIVERABLE[inferredDeliverableType] || 60);
        console.log(`[Themes] theme count target - deliverable_type='${inferredDeliverableType}', TOP_N=${TOP_N}${explicitTarget ? ' (explicit override)' : ' (inferred)'}`);

        // 2026-06-08 - OBJECTIVE-RELEVANCE SCORING (pre-ranking). Score every theme
        // 0-100 against the objective and KEEP ALL. Replaces the binary drop-gate;
        // relevance becomes the continuous lever the ranking + depth + threshold use.
        result.themes = await this._scoreThemesByObjectiveRelevance(result.themes, onStream);

        try {
            const beforeFilter = result.themes.length;
            // 2026-10-01 (plan R-D4 / Stage 1.4, Independence Rule): two citations are the same ORIGIN
            // when they share a canonical URL (host + path, no www., no tracking params), or, lacking a
            // URL, the same normalized source name. 4,620 URL groups were ingested under two source
            // labels, so counting names made one article "convergent" with itself.
            const _originKey = (c: any): string => {
                const url = String(c?.url || c?.sourceUrl || '').trim();
                if (url) {
                    try {
                        const u = new URL(url);
                        const host = u.hostname.toLowerCase().replace(/^www\./, '');
                        const path = u.pathname.replace(/\/+$/, '') || '/';
                        return `${host}${path}`;
                    } catch { /* fall through to name */ }
                }
                return String(c?.sourceName || c?.sourceFile || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            };
            const distinctSourcesOf = (t: any): Set<string> => new Set(
                (Array.isArray(t.citations) ? t.citations : [])
                    .map(_originKey)
                    .filter(Boolean)
            );
            const goalOf = (t: any): number => this._relevanceOf(t);  // objective relevance is the lever
            const densityOf = (t: any): number => {
                const distinct = distinctSourcesOf(t).size;
                const cits = Array.isArray(t.citations) ? t.citations.length : 0;
                return distinct * 10 + cits;
            };

            // 2026-06-03 - RELEVANCE-FIRST RANKING, NO SOURCE-DIVERSITY DROP.
            // The prior "thick-evidence" filter DROPPED every theme citing <2
            // distinct sources and even EMPTIED the whole set when none cleared
            // the bar. That is the source-diversity discrimination the owner
            // explicitly forbade ("relevance to the research goal is the ONLY
            // axis; a relevant single-source theme must not be dropped") and was
            // a top cause of THIN themes. We now rank by goalAlignment
            // (relevance) first, with corroboration density only as a tiebreaker,
            // and KEEP single-source themes. Corroboration is recorded as a
            // neutral tag, never a gate.
            const sorted = result.themes.slice().sort((a: any, b: any) => {
                const ga = goalOf(a), gb = goalOf(b);
                if (gb !== ga) return gb - ga;             // relevance to goal first
                return densityOf(b) - densityOf(a);        // then corroboration as tiebreaker
            });
            for (const t of sorted) {
                const ds = distinctSourcesOf(t).size;
                (t as any).distinct_source_count = ds;
                (t as any).evidence_tier = ds >= 2 ? 'thick' : 'single_source';
            }
            // 2026-10-01 (plan Stage 1.8, audit B5): the theme EVIDENCE GATE. Applied after the
            // deliverable-cap tagging below, so it can clear the cap on a hedged theme.
            let _themeGateReport: import('./themeEvidenceGate').ThemeEvidenceReport | null = null;
            // 2026-06-07 - DO NOT cap the persisted/dashboard set. The Research
            // Browser shows ALL on-objective themes; the TOP_N cap applies only when
            // a downstream deliverable (deck/persona/recs) consumes a SUBSET (it
            // slices this.lastThemes, tagged below). Capping here was the filter that
            // cut 344 on-objective themes to 60 (then a 2nd gate to 22) - the
            // "only 22 in the Research Browser" bug. Keep all, ranked by relevance.
            // 2026-06-08 - IN-DELIVERABLE = RELEVANCE THRESHOLD, not a rank cap. A theme
            // is consumed by downstream deliverables (deck/persona/recs) if it clears the
            // objective-relevance bar, NOT because it landed in the first TOP_N by position.
            // ALL themes are still persisted + shown in the Research Browser; the tag only
            // governs the downstream SUBSET. TOP_N survives solely as a safety floor so a
            // run where relevance scoring failed (every theme at the neutral 50) still
            // exposes a sensible default subset rather than all-or-nothing.
            const IN_DELIVERABLE_RELEVANCE = 50;
            const anyScored = sorted.some((t: any) => typeof t.objectiveRelevance === 'number');
            sorted.forEach((t: any, i: number) => {
                (t as any).rank = i;
                (t as any).withinDeliverableCap = anyScored
                    ? this._relevanceOf(t) >= IN_DELIVERABLE_RELEVANCE   // relevance lever
                    : i < TOP_N;                                          // fallback only if scoring failed
            });
            result.themes = sorted;
            try {
                const { applyThemeEvidenceGate } = await import('./themeEvidenceGate');
                _themeGateReport = applyThemeEvidenceGate(result.themes);
                if (_themeGateReport.flagged) {
                    console.warn(`[Themes][evidence-gate] ${_themeGateReport.flagged} theme(s) flagged (hedge promotion / unverified identifier); ${_themeGateReport.excludedFromDeliverables} excluded from downstream deliverables, all still shown`);
                    onStream(`Evidence gate: ${_themeGateReport.flagged} theme(s) flagged, ${_themeGateReport.excludedFromDeliverables} held back from deliverables`);
                }
            } catch (gateErr: any) {
                console.warn('[Themes][evidence-gate] skipped (non-fatal):', gateErr?.message || gateErr);
            }
            const inDeliv = result.themes.filter((t: any) => t.withinDeliverableCap).length;
            const multi = result.themes.filter((t: any) => t.evidence_tier === 'thick').length;
            const single = result.themes.length - multi;
            console.log(`[Themes] relevance-first ranking: kept ALL ${result.themes.length} of ${beforeFilter} (full set shown); ${inDeliv} clear the in-deliverable relevance bar (>=${IN_DELIVERABLE_RELEVANCE}${anyScored ? '' : ', FALLBACK rank<' + TOP_N + ' - scoring unavailable'}); ${multi} multi-source, ${single} single-source${_themeGateReport ? `, ${_themeGateReport.flagged} evidence-flagged` : ''}`);
        } catch (filterErr: any) {
            console.warn('[Themes] relevance-first ranking failed (non-fatal):', filterErr?.message || filterErr);
        }

        // 2026-04-29 - BREADTH FLOOR ENFORCEMENT. If theme extraction comes
        // back below the corpus-density floor, re-prompt the LLM with explicit
        // feedback that it under-extracted. The model gets one retry with
        // stronger instructions. This catches cases where: (a) Gemini
        // repetition-collapsed and the Claude fallback under-extracted, (b)
        // the LLM grouped too aggressively, (c) earlier prompt anchors snuck
        // through.
        // 2026-05-24 - Raised from 12 to 20 to honor the user-stated minimum.
        // 2026-06-05 - Bug 3: raised again 20 → 28 because the user reported
        // "wall feels thin, want 4 full rows of themes." With a 3-column wall
        // 28 themes = ~9 rows, comfortably above the perceived-thin threshold.
        // The domain-relevance gate drops ~30% of breadth-pass output as off-
        // domain, so a 28-floor produces ~20 surviving themes - meeting both
        // the original 20-floor intent AND the new wall density.
        const BREADTH_FLOOR = 28;
        const themeCount = result.themes.length;
        let retriedThemes = false;
        if (themeCount < BREADTH_FLOOR && !feedback) {
            console.warn(
                `[Themes] BREADTH FLOOR VIOLATION - only ${themeCount} themes returned (floor=${BREADTH_FLOOR}). ` +
                `Re-prompting with under-extraction feedback.`
            );
            // 2026-10-01 (plan Stage 4.4 / D8, the RI contract): the retry is a DELTA TURN. The prior
            // themes are anchored by name and the model is asked only for ADDITIONS from the widened
            // window; the two sets are merged (dedupe by normalized name) instead of discarding the
            // first pass. The stable prompt prefix is cache-aligned (R-T1), so the re-ask pays for
            // the widened window, not for regenerating what already exists.
            const _priorNames = result.themes.map((t: any) => String(t?.name || t?.title || '').trim()).filter(Boolean);
            const reprompt = `Your previous theme extraction returned only ${themeCount} themes.
That is BELOW the breadth floor of ${BREADTH_FLOOR}. This pass gives you a WIDER slice of the
corpus: the evidence window has been BROADENED to include adjacent, relevance-ranked chunks that
the focused first pass excluded. The additional evidence is real corpus, not filler.

THEMES YOU ALREADY PRODUCED (kept as they are; do NOT repeat or rephrase them):
${_priorNames.map((n: string, i: number) => `  ${i + 1}. ${n}`).join('\n')}

Return ONLY NEW themes (target ${Math.max(4, BREADTH_FLOOR - themeCount)} or more) that the widened evidence supports:
  1. Read EVERY chunk in this widened window, including the newly-included adjacent evidence.
  2. The adjacent evidence surfaces themes the narrow first pass could not see - find them.
  3. Where a single umbrella theme conflates distinct evidenced findings, separate them
     (e.g. "AI in Sales" -> "AI lead scoring", "AI account-history summarization",
     "AI email personalization") ONLY when each split is independently supported by a chunk.
  4. Each theme MUST cite at least one chunk; do NOT invent themes to hit a number. If the
     widened corpus genuinely supports fewer than ${BREADTH_FLOOR}, return what the evidence
     supports - an honest count from real evidence beats a padded one.
  5. Each theme can carry THINNER depth this round - BREADTH OVER DEPTH.

Now extract the full theme set from the widened evidence.`;
            try {
                // Phase 2 (broader retrieval): broaden=true widens the chunk window to
                // relevance-ranked backfill so the model sees MORE evidence, rather than
                // re-prompting the same narrow set to manufacture splits.
                const retry = await this._runBreadthPass(reprompt, schema, onStream, 'Themes-Retry', true);
                const _norm = (n: any) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
                const _have = new Set(result.themes.map((t: any) => _norm(t?.name || t?.title)));
                const additions = (Array.isArray(retry?.themes) ? retry.themes : [])
                    .filter((t: any) => t && !isMetaTheme(t))
                    .filter((t: any) => { const k = _norm(t?.name || t?.title); if (!k || _have.has(k)) return false; _have.add(k); return true; });
                if (additions.length > 0) {
                    console.log(`[Themes] Delta retry added ${additions.length} new theme(s) to the ${themeCount} kept (${(retry?.themes || []).length - additions.length} duplicate/meta dropped)`);
                    result.themes = result.themes.concat(additions);
                    retriedThemes = true;
                    if (retry.methodology && !result.methodology) result.methodology = retry.methodology;
                } else {
                    console.warn(`[Themes] Delta retry added nothing new (${retry?.themes?.length ?? 0} returned). Keeping original.`);
                }
            } catch (retryErr: any) {
                console.warn('[Themes] Retry failed, keeping original count:', retryErr?.message || retryErr);
            }
        }

        // 2026-05-30 / 2026-06-07 - DOMAIN-RELEVANCE GATE, only when a retry fired.
        // The BREADTH FLOOR retry regenerates un-gated themes, so re-gate THAT case.
        // But running it unconditionally was a redundant 2nd LLM gate that compounds
        // pruning (the non-deterministic gate dropped a healthy 60-set to 22 - the
        // "only 22 in the Research Browser" bug). The first gate (pre-ranking) already
        // removed off-objective themes on the non-retry path, so skip the re-gate there.
        if (retriedThemes) {
            // The BREADTH-FLOOR retry regenerated an un-scored, un-ranked set. Score it
            // by objective relevance and re-rank so depth-enrichment + display use the
            // SAME relevance lever as the main path (not a fresh binary gate).
            result.themes = await this._scoreThemesByObjectiveRelevance(result.themes, onStream);
            const anyScoredR = result.themes.some((t: any) => typeof t.objectiveRelevance === 'number');
            result.themes.sort((a: any, b: any) => this._relevanceOf(b) - this._relevanceOf(a));
            result.themes.forEach((t: any, i: number) => {
                (t as any).rank = i;
                (t as any).withinDeliverableCap = anyScoredR ? this._relevanceOf(t) >= 50 : i < TOP_N;
            });
        }

        // 2026-04-29 - PASS 2 DEPTH ENRICHMENT.
        // Each breadth theme is enriched in parallel via Claude Opus 4.7 with
        // its own context: theme name + description + cited quotes. Opus
        // populates subThemes / dimensions / contradictions / temporalArc /
        // implications per theme. Themes whose enrichment fails are returned
        // with breadth-only fields (the deliverable still works without depth).
        // Concurrency is throttled (BATCH_SIZE) to stay under per-minute API
        // limits. Cost: ~$0.30-0.40 per theme on Opus 4.7.
        if (result.themes.length > 0) {
            try {
                // 2026-06-08 - DEPTH REACHES EVERY OBJECTIVE-RELEVANT THEME, in relevance
                // order - NOT an arbitrary count. result.themes is relevance-ranked (desc),
                // so the depth set is the contiguous prefix clearing the relevance bar.
                // Relevance is the lever (owner directive); DEPTH_SAFETY_MAX is only a
                // runaway-cost guard for a pathological corpus, never the selector. Themes
                // below the bar still persist + render in the Research Browser; their
                // Analysis section just stays empty (breadth without an unbounded bill).
                const DEPTH_RELEVANCE_BAR = 40;   // core (>=60) + adjacent (30-59) earn depth
                const DEPTH_SAFETY_MAX = 250;     // cost ceiling only, not a relevance lever
                let cutoff = result.themes.findIndex((t: any) => this._relevanceOf(t) < DEPTH_RELEVANCE_BAR);
                if (cutoff < 0) cutoff = result.themes.length;   // every theme clears the bar
                cutoff = Math.min(Math.max(cutoff, 1), DEPTH_SAFETY_MAX);
                const toEnrich = result.themes.slice(0, cutoff);
                const breadthOnly = result.themes.slice(cutoff);
                onStream(`[Themes] Pass 2: Enriching ${toEnrich.length} objective-relevant themes (relevance >= ${DEPTH_RELEVANCE_BAR}) of ${result.themes.length} with depth (Gemini 3.1 Pro, parallel); ${breadthOnly.length} ship breadth-only...`);
                console.log(`[Themes] Pass 2 DEPTH starting: enriching ${toEnrich.length}/${result.themes.length} (relevance>=${DEPTH_RELEVANCE_BAR}, safety max ${DEPTH_SAFETY_MAX}) via Gemini 3.1 Pro`);
                const enriched = await this._enrichThemesDepth(toEnrich as any[], onStream);
                result.themes = [...(enriched as any[]), ...breadthOnly] as any;
                const enrichedCount = (enriched as any[]).filter((t: any) => Array.isArray(t.subThemes) && t.subThemes.length > 0).length;
                console.log(`[Themes] Pass 2 DEPTH complete: ${enrichedCount}/${enriched.length} enriched + ${breadthOnly.length} breadth-only = ${result.themes.length} total persisted`);
                onStream(`[Themes] Pass 2 complete: ${enrichedCount} enriched + ${breadthOnly.length} breadth = ${result.themes.length} themes`);
            } catch (depthErr: any) {
                console.warn('[Themes] Pass 2 depth enrichment failed, returning breadth-only themes:', depthErr?.message || depthErr);
            }
        }

        // 2026-05-19 - EMBEDDING-BASED GOAL ALIGNMENT SCORING.
        // Replaces the LLM's self-scored goalAlignment (which under-scored
        // out of caution, producing all-themes-below-60 failures) with
        // mathematical cosine similarity between embedding(researchGoal) and
        // embedding(each theme text). The result writes back onto
        // theme.goalAlignment AND theme.metadata.goalAlignment so the
        // treemap weight + display filter pick up the math-based score.
        // Failure-isolated: any error leaves the LLM scores in place.
        try {
            const { scoreThemesByGoalSimilarity } = await import('./embeddingAlignmentScorer');
            const stats = await scoreThemesByGoalSimilarity(result.themes as any[], this.goal);
            if (stats.error) {
                // P0.4 - surface the fallback (LLM-based scores are less precise than
                // embedding-based; user should know the theme-goal alignment is approximate).
                console.warn('[Themes] embedding-alignment scoring failed:', stats.error);
                if (typeof onStream === 'function') {
                    onStream(`[Themes] Embedding-based goal-alignment scoring unavailable (${String(stats.error).slice(0, 100)}); LLM self-scored alignment used as fallback (less precise).`);
                }
            } else {
                console.log(
                    `[Themes] embedding-alignment scored ${stats.scored} themes ` +
                    `(${stats.skipped} skipped) - cos range [${stats.minSimilarity}, ${stats.maxSimilarity}], ` +
                    `avg cos ${stats.avgSimilarity}, avg goalAlignment ${stats.avgScore}/100`
                );
            }
        } catch (embedErr: any) {
            console.warn('[Themes] embedding-alignment skipped:', embedErr?.message || embedErr);
        }

        // Tier C2 (2026-04-28) - persist the theme synthesis to the wiki so
        // it becomes searchable archive evidence for future engagements. The
        // wiki is HiC's compounding knowledge layer; theme syntheses are the
        // highest-density artifact this app produces. Written as a markdown
        // article with kind=synthesis under wiki/synthesis/, indexed by the
        // chunked vector store on next embed pass.
        try {
            await this._persistThemesToWiki(result);
        } catch (err: any) {
            console.warn('[Themes] wiki persistence skipped:', err?.message || err);
        }

        // 2026-05-24 NotebookLM uplift Wire 3: stamp reproducibility_hash
        // so same corpus + same goal produces same identity fields.
        // The hash is visible in the deliverable header + checked by
        // validate_theme_reproducibility.py Stop hook against the baseline.
        try {
            const { stampReproducibilityHash } = await import('./reproducibilityHash');
            const stamped = stampReproducibilityHash(result, {
                corpus_items: (result as any).documents || (result as any).corpus_items || [],
                research_goal: this.goal || '',
                deliverable_type: 'themes',
                framework_versions: { 'themes': '1.0' },
            });
            (result as any).reproducibility_hash = (stamped as any).reproducibility_hash;
            (result as any).pipeline_version = (stamped as any).pipeline_version;
            (result as any).stamped_at = (stamped as any).stamped_at;
            console.log(`[Themes] reproducibility_hash=${(result as any).reproducibility_hash}`);
        } catch (err: any) {
            console.warn('[Themes] reproducibility stamp skipped:', err?.message || err);
        }

        // Single quality chokepoint: hard-rule citation grounding (#2) + wire
        // the self-improvement critic (#4). See _finalizeDeliverable.
        this._finalizeDeliverable('themes', result);

        // U1 - make the run's themes available to the downstream recommendations stage.
        // 2026-06-07 - the persisted/displayed set is now ALL on-objective themes,
        // but downstream consumers (recs/journey/gap) get only the top-ranked subset
        // (withinDeliverableCap) so their prompts don't bloat past the token cap.
        try {
            const all = Array.isArray(result.themes) ? result.themes : [];
            const capped = all.filter((t: any) => (t as any).withinDeliverableCap !== false);
            this.lastThemes = capped.length ? capped : all.slice(0, 60);
        } catch { /* noop */ }

        return result;
    }

    /**
     * 2026-04-29 - PASS 1 BREADTH RUNNER.
     *
     * Two-pass theme architecture, breadth pass. Tries Gemini 3.1 Pro one-shot
     * with the cached corpus parts. Pro gives us:
     *   - 1M-token context (the entire corpus fits - no MAX_CORPUS_CHARS clipping
     *     for breadth analysis, unlike Flash via chatSession which compresses
     *     accumulated context as it grows)
     *   - No chat-history anchoring (fresh analytical pass - the chatSession's
     *     prior ingestion summary biases Flash toward the summary's framing)
     *   - Stronger long-form structured-JSON output than Flash on this prompt
     *
     * Fallback chain: Pro → chatSession Flash (with executeStepResilient's
     * built-in Claude fallback for repetition collapse). Any error from the
     * Pro call routes us to the chat path, so behavior is never worse than
     * the previous single-pass implementation.
     */
    private async _runBreadthPass(prompt: string, schema: Schema, onStream: (t: string) => void, label: string = 'Themes', broaden: boolean = false): Promise<StepResult_Themes> {
        // 2026-05-19 - NotebookLM-style goal-evidence injection on the Pro
        // breadth path. Mirrors the injection in executeStep / executeStepViaGPT
        // so the Pro one-shot sees the same goal-anchored chunks the chat-
        // session path does. Failure-isolated: empty block on error.
        let goalEvidenceBlock = '';
        try {
            goalEvidenceBlock = await this.getGoalEvidenceBlock();
        } catch (e: any) {
            console.warn(`[_runBreadthPass/${label}] goal-evidence retrieval skipped:`, e?.message || e);
        }
        // 2026-06-05 (Step 5, volume-to-insight) - substrate (multi-angle coverage) block.
        let substrateBlock = '';
        try {
            substrateBlock = await this.getSubstrateEvidenceBlock();
        } catch (e: any) {
            console.warn(`[_runBreadthPass/${label}] substrate retrieval skipped:`, e?.message || e);
        }
        // Phase 2 MCR (intent-realization-plan) - prefer the chunk-addressed
        // corpus (pickChunksForPrompt at 30K tokens, KL auto-pinned, cited by
        // pointer) over the bulk goal-evidence pack + substrate (the embedding-
        // RAG path). On a sparse manifest the chunk block is empty and we fall
        // back to the legacy bulk evidence so themes never generate from nothing.
        let mcrCorpusBlock = '';
        if (this.useMcrCorpus) {
            mcrCorpusBlock = await this.buildChunkCorpusBlock(`${this.goal} ${label}`, { tokenBudget: 30_000, broaden });
        }
        const useMcr = this.useMcrCorpus && mcrCorpusBlock.length > 0;
        // 2026-06-20 COST GUARD (anti-RAG enforcement on the legacy fresh-run path).
        // When MCR is unavailable (fresh/upload runs: articles aren't engagement-
        // scoped, so the manifest catalog is empty by design), themes fell through
        // to bulk evidence that was observed at ~804KB and got sharded into ~14
        // premium Gemini 3.1 Pro calls + a floor-retry — the documented $100+/run
        // spike (Jun 7: $137). The MCR path proves a 30K-token (~120KB) budget is
        // sufficient for theme breadth, and the goal-evidence pack is already
        // goal-relevance-ranked, so cap the legacy evidence to the SAME budget.
        // This collapses the ~14-shard fan-out into a single bounded call (the
        // sharder returns null below WINDOW_CHARS), cutting Pro input ~5-15x with
        // no model change. Breadth quality holds: it keeps the strongest-ranked
        // slice, and the floor-retry still broadens if the count comes up short.
        const LEGACY_EVIDENCE_CHAR_CAP = 120_000;   // ~30K tokens, matches MCR budget
        if (useMcr) {
            // ANTI-RAG PRIMARY (Unified Vision): themes ground on goal-relevance-
            // ranked manifest CHUNK POINTERS (cite-by-pointer, ~30K-token budget),
            // not bulk corpus. This is the intended path on every run including
            // fresh ones now that the embedding index powers chunks-by-goal.
            onStream(`[${label}] Grounding: ANTI-RAG manifest chunks (goal-relevance-ranked, ${Math.round(mcrCorpusBlock.length / 1024)}KB pointers).`);
            console.log(`[${label}] GROUNDING=anti-rag-mcr block=${Math.round(mcrCorpusBlock.length / 1024)}KB (goal-relevance manifest pointers)`);
        } else {
            // LEGACY BOUNDED FALLBACK (only when the manifest/embedding path yields
            // nothing - e.g. a brand-new install before the wiki backfill runs).
            // This is NOT the intended path: warn LOUDLY so a silent regression to
            // bulk-corpus injection (the root cause of the 2026-06 Gemini cost spike)
            // can never go unnoticed again. Evidence is hard-capped to the SAME
            // budget as MCR so the cost stays bounded even here.
            console.warn(`[${label}] GROUNDING=LEGACY-BULK-FALLBACK (anti-RAG manifest path returned no chunks - is the wiki backfill complete? run POST /api/wiki/chunks-backfill). Capping evidence to ${LEGACY_EVIDENCE_CHAR_CAP / 1024}KB to bound premium-Pro cost.`);
            onStream(`[${label}] Grounding: legacy bulk fallback (manifest empty) - capped to ${LEGACY_EVIDENCE_CHAR_CAP / 1024}KB. Run the wiki backfill to enable anti-RAG manifest grounding.`);
            if (goalEvidenceBlock.length > LEGACY_EVIDENCE_CHAR_CAP) {
                goalEvidenceBlock = goalEvidenceBlock.slice(0, LEGACY_EVIDENCE_CHAR_CAP);
            }
            const remaining = Math.max(0, LEGACY_EVIDENCE_CHAR_CAP - goalEvidenceBlock.length);
            if (substrateBlock.length > remaining) substrateBlock = substrateBlock.slice(0, remaining);
        }
        const effectivePrompt = useMcr
            ? [this.buildObjectiveAnchor(), mcrCorpusBlock, prompt].filter(s => s && s.length > 0).join('\n')
            : [this.buildObjectiveAnchor(), goalEvidenceBlock, substrateBlock, prompt].filter(s => s && s.length > 0).join('\n');

        // 2026-06-08 - SHARDED BREADTH (keystone). When MCR corpus is available,
        // run breadth as K relevance-ranked, coverage-driven shards instead of one
        // 59-chunk call. Each shard is small (escapes the Gemini-3 structured-JSON
        // thinking-collapse documented at 30% on 5k+ prompts) and a failed shard is
        // local (it contributes nothing; survivors still yield breadth). K is NOT a
        // fixed number: shards run in parallel waves until theme yield saturates or
        // the relevance-ranked catalog is exhausted (relevance coverage is the lever).
        // Falls through to the proven single-pass below only if EVERY shard fails.
        if (useMcr) {
            const sharded = await this._runShardedBreadth(prompt, schema, onStream, label, broaden);
            if (sharded && Array.isArray((sharded as any).themes) && (sharded as any).themes.length > 0) {
                return sharded;
            }
            onStream(`[${label}] Sharded breadth yielded nothing; falling back to single-pass.`);
        }

        // 2026-06-08 - LEGACY-CORPUS SHARDING (the fresh-run keystone). MCR is
        // structurally empty on a FRESH run: collected articles live under
        // articles/<source>/ with NO engagement scoping, so the manifest
        // engagement-filter returns catalog=0 BY DESIGN (articles are a cross-
        // engagement shared corpus retrieved by relevance, not engagement). That
        // forced every fresh/upload run onto the single one-shot below, which
        // COLLAPSES Gemini 3.1 Pro (observed live 2026-06-08: 1 theme in 453s from
        // a 927KB prompt; retries limped to 38, floor=28). The corpus still lives
        // in corpusFileParts, so shard THOSE into ~30K-token windows and run the
        // SAME parallel-wave breadth the MCR path gets - collapse-avoidance for
        // fresh runs too. Each shard drops the bulk goal-evidence/substrate blocks
        // (its window IS its evidence), keeping shards small.
        if (!useMcr) {
            // The collapse-driving BULK is the goal-evidence pack (observed
            // ~804KB / 120 chunks), injected into the prompt TEXT - NOT
            // corpusFileParts (often just 1-2 small parts). Window the combined
            // evidence text and shard it.
            const shardedLegacy = await this._runShardedBreadthFromCorpus(prompt, schema, onStream, label, goalEvidenceBlock, substrateBlock);
            if (shardedLegacy && Array.isArray((shardedLegacy as any).themes) && (shardedLegacy as any).themes.length > 0) {
                return shardedLegacy;
            }
            // null => evidence small enough for one-shot (no collapse risk), or every shard failed; single-pass below handles it.
        }

        // Step 1: try Gemini 3.1 Pro one-shot with the cached corpus parts.
        // 2026-06-05 (Meta-Harness M1) - trace intercept on the BREADTH path.
        // This path does NOT go through executeStepResilient, so it needs its
        // own recordTurn call. Pro success records one turn; Pro failure
        // records the failed turn AND falls through to executeStepResilient
        // (which will record its own turn for the Flash→GPT chain).
        const _trace_breadth_started_at = Date.now();
        if (this.corpusFileParts && this.corpusFileParts.length > 0) {
            try {
                onStream(`[${label}] Pass 1 BREADTH via Gemini 3.1 Pro (1M context, fresh corpus pass)...`);
                console.log(`[${label}] Pass 1 BREADTH: Gemini 3.1 Pro one-shot with ${this.corpusFileParts.length} corpus parts`);
                const proResult = await withRetry(async () => {
                    const result: any = await this.ai.models.generateContentStream({
                        model: 'gemini-3.1-pro-preview',
                        // Phase 2 MCR - when the chunk corpus is in the prompt, do NOT
                        // also bulk-inject the raw corpus parts (the BANNED pattern that
                        // produced the 1.6MB prompt -> empty response). Legacy fallback
                        // still sends the parts so a sparse-manifest run isn't starved.
                        contents: [{ role: 'user', parts: useMcr ? [{ text: effectivePrompt }] : [...this.corpusFileParts, { text: effectivePrompt }] }],
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: schema,
                            // 2026-06-07 (RI - commit to the highest-confidence fix). temperature:0
                            // (greedy) + structured-JSON + Gemini-3 thinking is the DOCUMENTED
                            // repetition-collapse trigger (Google cookbook #449; AI-dev-forum LiteLLM
                            // report) and caused the Pass-1 "malformed payload" / wasted ~280s pass.
                            // The evidence-backed fix is the model's DEFAULT temperature - Gemini-3
                            // thinking models are designed to run at default, and Google's own API
                            // examples set NO temperature. So we OMIT the override entirely (not an
                            // interpolated 0.4 guess): the native default is the strongest escape from
                            // the greedy-repetition basin. Breadth is exploratory (diversity is
                            // desirable); determinism is enforced downstream at the cap +
                            // deterministic-naming + cache. seed kept for best-effort reproducibility.
                            seed: 42,
                            systemInstruction: stripCacheMarkers(this.systemInstructionCached),
                        } as any,
                    });
                    const stream = (result.stream || result) as AsyncIterable<GenerateContentResponse>;
                    let fullText = '';
                    let _lastRepCheck = 0;
                    let _usage: any = null;   // 2026-06-20 cost meter: capture real usage from the final chunk
                    for await (const chunk of stream) {
                        if ((chunk as any).usageMetadata) _usage = (chunk as any).usageMetadata;
                        const text = chunk.text;
                        if (text) {
                            fullText += text;
                            onStream(fullText);
                            // 2026-06-08 - EARLY REPETITION-COLLAPSE ABORT. Gemini 3.1 Pro
                            // intermittently collapses into a degenerate loop on structured-JSON
                            // breadth ("948120394..." x320 on the 2026-06-08 run), which the
                            // post-hoc RepetitionGuard only caught at 20K chars after ~322s
                            // wasted. Mirror its probe-and-count detection but run it every ~3KB
                            // on the tail: a 30-char probe repeating 25+ times inside a 2KB window
                            // is unambiguously degenerate (legit JSON varies). Throwing here makes
                            // withRetry/GPT fallback fire in seconds, not minutes. The cost of a
                            // collapse drops ~50x; it does NOT reduce collapse FREQUENCY (sharded
                            // breadth is the separate fix for that).
                            if (fullText.length - _lastRepCheck >= 3000) {
                                _lastRepCheck = fullText.length;
                                const tail = fullText.slice(-2000);
                                const probe = tail.slice(0, 30);
                                if (probe.trim().length >= 8) {
                                    const occurrences = tail.split(probe).length - 1;
                                    if (occurrences >= 25) {
                                        throw new Error(`Gemini Pro repetition-collapse detected early ("${probe.slice(0, 20).replace(/\s+/g, ' ')}" x${occurrences} in 2KB tail); aborting at ${fullText.length} chars for fast fallback`);
                                    }
                                }
                            }
                        }
                    }
                    recordDirectGeminiCall(`themes:${label}:breadth`, 'gemini-3.1-pro-preview', { usageMetadata: _usage });
                    return fullText;
                }, 2, 3000, `Gemini 3.1 Pro ${label} BREADTH`);

                const cleaned = tryRepairJson(proResult);
                const parsed = JSON.parse(cleaned) as StepResult_Themes;
                if ((parsed as any)?._error) {
                    throw new Error(`Gemini Pro returned non-JSON text: ${(parsed as any)._raw?.substring(0, 60)}`);
                }
                if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).themes)) {
                    throw new Error('Gemini Pro returned malformed themes payload');
                }
                console.log(`[${label}] Pass 1 BREADTH (Pro) returned ${(parsed as any).themes.length} themes`);
                // M1 trace - Pro success.
                try {
                    const { recordTurn } = await import('./traceRecorder');
                    recordTurn({
                        step_label: `${label} Pass-1 BREADTH (Pro)`,
                        model_id: 'gemini-3.1-pro-preview',
                        prompt: effectivePrompt,
                        response: proResult,
                        started_at: _trace_breadth_started_at,
                        temperature: 0,
                        seed: 42,
                        // 2026-06-06 - Deliverable tag so epoch proposer can
                        // grep traces by deliverable type (C2 closure).
                        note: 'deliverable=#themes',
                    });
                } catch { /* non-fatal */ }
                return parsed;
            } catch (proErr: any) {
                // P0.4 - surface the fallback with the specific reason so the user
                // can judge whether to retry or accept the secondary-model output.
                const msg = proErr?.message || String(proErr);
                console.warn(`[${label}] Pass 1 Pro failed:`, msg);
                onStream(`[${label}] Gemini 3.1 Pro unavailable for Pass 1 BREADTH (${msg.slice(0, 120)}). Falling back to Flash → GPT chain; theme depth may be reduced. Review theme breadth and re-run if needed.`);
                // M1 trace - Pro failure (the executeStepResilient call below records its own turn).
                try {
                    const { recordTurn } = await import('./traceRecorder');
                    recordTurn({
                        step_label: `${label} Pass-1 BREADTH (Pro)`,
                        model_id: 'gemini-3.1-pro-preview',
                        prompt: effectivePrompt,
                        response: '',
                        started_at: _trace_breadth_started_at,
                        failed: true,
                        error: msg,
                        temperature: 0,
                        seed: 42,
                        // 2026-06-06 - Deliverable tag (C2 closure) so the
                        // epoch proposer mines failed themes-Pro turns by
                        // deliverable.
                        note: 'deliverable=#themes | Pro one-shot failed; falling back to executeStepResilient (Flash + GPT-5.5)',
                    });
                } catch { /* non-fatal */ }
            }
        }

        // Step 2: fall back to existing chat-session path. executeStepResilient
        // has its own Claude-Opus-4.7 fallback for repetition collapse, so this
        // is the same Flash→Claude chain that shipped previously.
        return await this.executeStepResilient<StepResult_Themes>(prompt, schema, [], onStream, label);
    }

    /**
     * 2026-06-08 - Run ONE breadth shard: a Gemini 3.1 Pro one-shot over a single
     * relevance-ranked corpus window. Returns the parsed themes payload, or NULL on
     * failure (collapse / malformed / quota). NEVER throws into the wave loop - a dead
     * shard is local; surviving shards still produce breadth. Carries the same early
     * in-stream repetition-collapse abort as the single-pass path (fail in seconds,
     * not 322s). One retry only (vs two single-pass) to keep waves fast.
     */
    private async _runBreadthShard(contents: any[], effectivePrompt: string, schema: Schema, onStream: (t: string) => void, label: string, shardParts?: { stable: string; window: string }): Promise<StepResult_Themes | null> {
        const started = Date.now();
        // 2026-06-13 - OPUS 4.8 PRIMARY (temp stand-in for the banned Fable 5).
        // Gemini 3.1 Pro shards repetition-collapse under structured-JSON +
        // greedy decoding ("1111" x66, "blockquote" x51 - observed on every
        // large run), and the GPT-5.5 recovery is post-hoc latency. Claude
        // Opus 4.8 does not share the collapse failure mode and already writes
        // the deliverables this corpus feeds. Try Opus first (schema described
        // in-prompt; no temperature - opus-4-8 400s on it); on ANY failure fall
        // through to the existing Gemini -> GPT-5.5 chain unchanged, so
        // reliability is strictly added.
        const shardModel = artifactModelFor('theme-breadth');
        try {
            // 2026-06-29 - Honor the Opus cap. While OPUS_CAP_ACTIVE (single source of
            // truth in aiRouter) is true, claude-opus-4-8 returns HTTP 400, so the
            // Opus-first attempt below was eating a doomed 400 on EVERY theme shard
            // (live-observed 10x) before falling through to Gemini. Skip it while capped
            // and go straight to the Gemini -> GPT-5.5 chain; the single flag flip in
            // aiRouter restores Opus here in lockstep with the other two cap sites.
            // 2026-10-01 (plan Stage 4.5 bake-off): the shard model is the authority's pick for the
            // `theme-breadth` kind (Flash after the bake-off; the reasoning model if the tier is
            // reverted). A Claude pick runs the cache-aligned Claude call; a Gemini pick skips it and
            // leads the Gemini chain below with that model.
            if (!OPUS_CAP_ACTIVE && (process.env as any).ANTHROPIC_API_KEY && endpointForModel(shardModel) === 'anthropic') {
                const { callAIWithRetry } = await import('./aiRetryClient');
                const schemaDescription = `\n\nOUTPUT A SINGLE JSON OBJECT MATCHING THIS SHAPE:\n${JSON.stringify(schema, null, 2)}\n\nReturn ONLY the JSON object, no markdown fences, no preamble, no trailing prose.`;
                // 2026-09-30 (plan Stage 0.5): the Claude reasoning model resolves through the ONE
                // routing authority; theme breadth is schema-bound extraction, so effort=medium
                // (effortForArtifact('theme-breadth')) rides as _hicKind and aiRetryClient sends it.
                onStream(`[${label}] generating via ${shardModel}...`);
                // R-T1 / D2 (2026-10-01): stable prefix in `system` behind a cache marker (the proxy turns
                // HIC_CACHE_BREAK into an Anthropic cache_control breakpoint), only the shard window in
                // the user turn. Before this every shard re-sent ~70K chars of identical skill text
                // AFTER the corpus, so nothing was cacheable (audit D2: 86% of traced spend).
                const _system = shardParts
                    ? `${this.systemInstructionCached}\n${HIC_CACHE_BREAK}\n${shardParts.stable}${schemaDescription}`
                    : this.systemInstructionCached;
                const _user = shardParts
                    ? `=== CORPUS WINDOW FOR THIS SHARD ===\n${shardParts.window}\n=== END CORPUS WINDOW ===\nProduce the themes JSON for this window now.`
                    : effectivePrompt + schemaDescription;
                const data: any = await callAIWithRetry('anthropic', {
                    model: shardModel,
                    max_tokens: 32_000,
                    system: _system,
                    messages: [{ role: 'user', content: _user }],
                    _hicKind: 'theme-breadth',
                }, { label: `Themes ${label} SHARD (${shardModel})`, maxAttempts: 2, requestTimeoutMs: 600_000 });
                const text = (Array.isArray(data?.content) ? data.content : [])
                    .map((b: any) => (b?.type === 'text' && typeof b?.text === 'string' ? b.text : '')).join('').trim();
                const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
                const fableParsed = JSON.parse(tryRepairJson(cleaned)) as StepResult_Themes;
                if (fableParsed && Array.isArray((fableParsed as any).themes) && (fableParsed as any).themes.length > 0) {
                    onStream(`[${label}] ${shardModel} produced ${(fableParsed as any).themes.length} themes.`);
                    try {
                        const { recordTurn } = await import('./traceRecorder');
                        recordTurn({ step_label: `${label} SHARD`, model_id: shardModel, prompt: effectivePrompt, response: text.slice(0, 200_000), started_at: started, usage: data?.usage, note: 'deliverable=#themes | shard primary=claude reasoning model (aiRouter); no seed support; determinism via fixed catalog windows' });
                    } catch { /* non-fatal */ }
                    return fableParsed;
                }
                console.warn(`[${label}] Claude shard returned no themes; falling back to Gemini chain.`);
            }
        } catch (fableErr: any) {
            console.warn(`[${label}] Claude shard failed (${(fableErr?.message || String(fableErr)).slice(0, 120)}); falling back to Gemini chain.`);
        }
        try {
            const _geminiLead = endpointForModel(shardModel) === 'gemini' ? shardModel : 'gemini-3.1-pro-preview';
            onStream(`[${label}] generating via ${_geminiLead}...`);
            const proResult = await withRetry(async () => {
                const result: any = await this.ai.models.generateContentStream({
                    model: _geminiLead,
                    contents,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        seed: 42,
                        systemInstruction: stripCacheMarkers(this.systemInstructionCached),
                    } as any,
                });
                const stream = (result.stream || result) as AsyncIterable<GenerateContentResponse>;
                let fullText = '';
                let _lastRepCheck = 0;
                let _usage: any = null;   // 2026-06-20 cost meter: real usage from final chunk
                for await (const chunk of stream) {
                    if ((chunk as any).usageMetadata) _usage = (chunk as any).usageMetadata;
                    const text = chunk.text;
                    if (text) {
                        fullText += text;
                        onStream(fullText);
                        if (fullText.length - _lastRepCheck >= 3000) {
                            _lastRepCheck = fullText.length;
                            const tail = fullText.slice(-2000);
                            const probe = tail.slice(0, 30);
                            if (probe.trim().length >= 8) {
                                const occurrences = tail.split(probe).length - 1;
                                if (occurrences >= 25) {
                                    throw new Error(`shard repetition-collapse ("${probe.slice(0, 20).replace(/\s+/g, ' ')}" x${occurrences}); aborting at ${fullText.length} chars`);
                                }
                            }
                        }
                    }
                }
                recordDirectGeminiCall(`themes:${label}:breadth-shard`, 'gemini-3.1-pro-preview', { usageMetadata: _usage });
                return fullText;
            }, 1, 3000, `Gemini 3.1 Pro ${label} SHARD`);
            const parsed = JSON.parse(tryRepairJson(proResult)) as StepResult_Themes;
            if ((parsed as any)?._error || !parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).themes)) {
                throw new Error('shard returned malformed themes payload');
            }
            try {
                const { recordTurn } = await import('./traceRecorder');
                recordTurn({ step_label: `${label} SHARD`, model_id: 'gemini-3.1-pro-preview', prompt: effectivePrompt, response: proResult, started_at: started, temperature: 0, seed: 42, note: 'deliverable=#themes | shard' });
            } catch { /* non-fatal */ }
            return parsed;
        } catch (err: any) {
            const msg = err?.message || String(err);
            // 2026-06-08 - COLLAPSE RECOVERY (the 13-theme fix). A Gemini 3.1 Pro
            // shard that repetition-collapses (". . ." / "1111" output degeneration)
            // used to return 0 themes and silently drop its entire evidence window.
            // On the 2026-06-08 alumni-giving run, LP1 + LP4 collapsed this way and
            // the union fell to 13 themes (WORSE than the 38 we were fixing). GPT-5.5
            // does NOT share Gemini's repetition-collapse failure mode, so retry the
            // SAME window on GPT-5.5 before giving up. This converts a half-collapsed
            // run into full evidence coverage. Same fix benefits both shard drivers
            // (_runShardedBreadth + _runShardedBreadthFromCorpus share this method).
            console.warn(`[${label}] Gemini shard failed (${msg.slice(0, 100)}); recovering same window via GPT-5.5...`);
            onStream(`[${label}] Gemini shard collapsed; recovering this evidence window via GPT-5.5...`);
            try {
                const { analyzeTextJSON } = await import('./openaiService');
                const schemaDescription = `\n\nOUTPUT A SINGLE JSON OBJECT MATCHING THIS SHAPE:\n${JSON.stringify(schema, null, 2)}\n\nReturn ONLY the JSON object, no markdown fences, no preamble, no trailing prose.`;
                const gptResult = await analyzeTextJSON<StepResult_Themes>(
                    stripCacheMarkers(this.systemInstructionCached),
                    effectivePrompt + schemaDescription,
                    'gpt-5.5',
                    32_000,
                    0.2,
                );
                if (gptResult && typeof gptResult === 'object' && Array.isArray((gptResult as any).themes) && (gptResult as any).themes.length > 0) {
                    console.log(`[${label}] GPT-5.5 recovered ${(gptResult as any).themes.length} themes from the collapsed window.`);
                    onStream(`[${label}] GPT-5.5 recovered ${(gptResult as any).themes.length} themes from the collapsed window.`);
                    try {
                        const { recordTurn } = await import('./traceRecorder');
                        recordTurn({ step_label: `${label} SHARD`, model_id: 'gpt-5.5', prompt: effectivePrompt, response: (() => { try { return JSON.stringify(gptResult); } catch { return '[unserializable]'; } })(), started_at: started, temperature: 0.2, fallback_chain: ['gemini-3.1-pro-preview', 'gpt-5.5'], fallback_fired: true, note: 'deliverable=#themes | shard recovered via GPT-5.5' });
                    } catch { /* non-fatal */ }
                    return gptResult as StepResult_Themes;
                }
                console.warn(`[${label}] GPT-5.5 recovery returned no themes; skipping window.`);
            } catch (gerr: any) {
                console.warn(`[${label}] GPT-5.5 shard recovery also failed:`, (gerr?.message || String(gerr)).slice(0, 120));
            }
            try {
                const { recordTurn } = await import('./traceRecorder');
                recordTurn({ step_label: `${label} SHARD`, model_id: 'gemini-3.1-pro-preview', prompt: effectivePrompt, response: '', started_at: started, failed: true, error: msg, temperature: 0, seed: 42, fallback_chain: ['gemini-3.1-pro-preview', 'gpt-5.5'], fallback_fired: true, note: 'deliverable=#themes | shard failed (Gemini collapse + GPT recovery both failed)' });
            } catch { /* non-fatal */ }
            return null;
        }
    }

    /**
     * 2026-06-08 - SHARDED BREADTH driver. Covers the relevance-ranked catalog with
     * parallel waves of breadth shards until theme yield SATURATES (a wave adds fewer
     * than SATURATION_NEW unique themes) or the catalog is exhausted, bounded by a
     * cost-only safety ceiling. K (shard count) EMERGES from relevance coverage; it is
     * never a fixed number (per owner directive: relevance is the lever, not a cap).
     * Windows are built serially (cheap selection, disjoint via excludeIds); the
     * expensive Pro calls run in parallel per wave. Returns unioned + deduped themes,
     * or null if every shard failed (caller then runs the single-pass fallback).
     */
    private async _runShardedBreadth(prompt: string, schema: Schema, onStream: (t: string) => void, label: string, broaden: boolean = false): Promise<StepResult_Themes | null> {
        const SAFETY_MAX_SHARDS = 10;   // cost guard, NOT the lever
        const WAVE_SIZE = 2;            // shards run in parallel per wave (2026-06-16: capped 3->2;
                                       // 3 concurrent ~780KB Opus shards saturated the single-process
                                       // research-proxy -> ERR_EMPTY_RESPONSE mid-run. 2 is proven-safe.)
        const SATURATION_NEW = 3;       // a wave adding < this many new themes => saturated
        const SHARD_TOKENS = 30_000;
        const usedChunks = new Set<string>();
        const seen = new Set<string>();
        const allThemes: any[] = [];
        let methodology = '';
        let shardsRun = 0;
        let wave = 0;
        let anyShardSucceeded = false;
        while (shardsRun < SAFETY_MAX_SHARDS) {
            // Build this wave's windows SERIALLY (cheap selection; disjoint via
            // excludeIds so each shard sees fresh corpus). The expensive Pro calls
            // then run in PARALLEL below.
            const windows: { contents: any[]; eff: string; n: number; stable: string; window: string }[] = [];
            for (let w = 0; w < WAVE_SIZE && (shardsRun + windows.length) < SAFETY_MAX_SHARDS; w++) {
                const idx = shardsRun + windows.length;
                const block = await this.buildChunkCorpusBlock(`${this.goal} ${label}`, {
                    tokenBudget: SHARD_TOKENS,
                    excludeIds: Array.from(usedChunks),
                    skipAutoPin: idx > 0,
                    broaden,   // Phase 2: floor-retry widens to relevance-ranked backfill
                });
                if (!block) break;   // catalog exhausted
                const winChunks = this.lastCorpusChunkIds.slice();
                if (winChunks.length === 0) break;
                winChunks.forEach(id => usedChunks.add(id));
                const eff = [this.buildObjectiveAnchor(), block, prompt].filter(s => s && s.length > 0).join('\n');
                // 2026-10-01 (plan R-T1 / D2): the STABLE part (objective anchor + the theme-analyst
                // prompt, identical on every shard) and the per-shard corpus WINDOW travel separately so
                // the Claude call can put the stable text behind a cache breakpoint in `system` and
                // send only the window in the user turn. The Gemini/GPT fallbacks keep `eff`.
                windows.push({ contents: [{ role: 'user', parts: [{ text: eff }] }], eff, n: winChunks.length,
                    stable: [this.buildObjectiveAnchor(), prompt].filter(s => s && s.length > 0).join('\n'), window: block });
            }
            if (windows.length === 0) break;   // nothing left to cover
            wave++;
            onStream(`[${label}] Breadth wave ${wave}: ${windows.length} relevance-ranked shard(s) in parallel...`);
            const results = await Promise.all(
                windows.map((win, i) => this._runBreadthShard(win.contents, win.eff, schema, onStream, `${label}-S${shardsRun + i + 1}`, { stable: win.stable, window: win.window }))
            );
            let waveNew = 0;
            for (const r of results) {
                if (!r || !Array.isArray((r as any).themes)) continue;
                anyShardSucceeded = true;
                if (!methodology && (r as any).methodology) methodology = (r as any).methodology;
                for (const t of (r as any).themes) {
                    const key = String(t?.name || '').trim().toLowerCase();
                    if (key && !seen.has(key)) { seen.add(key); allThemes.push(t); waveNew++; }
                }
            }
            shardsRun += windows.length;
            console.log(`[${label}] sharded breadth wave ${wave}: +${waveNew} new themes (total ${allThemes.length}); shards run=${shardsRun}, catalog chunks covered=${usedChunks.size}`);
            onStream(`[${label}] Wave ${wave}: +${waveNew} new themes (running total ${allThemes.length}).`);
            // 2026-06-08 - Stream this wave's accumulated themes to the live consumer
            // (App.tsx) so the Research Browser, chat context, themes.json corpus, and
            // manifest count update AS the re-synthesis pours in, not only at the end.
            if (waveNew > 0) { try { this.onThemeProgress?.(allThemes.slice()); } catch { /* non-fatal */ } }
            if (waveNew < SATURATION_NEW) break;       // saturated - relevance coverage exhausted
            if (windows.length < WAVE_SIZE) break;     // catalog exhausted mid-wave
        }
        if (!anyShardSucceeded || allThemes.length === 0) return null;
        console.log(`[${label}] Sharded breadth complete: ${allThemes.length} unique themes across ${shardsRun} shards (${wave} waves), ${usedChunks.size} chunks covered.`);
        onStream(`[${label}] Sharded breadth complete: ${allThemes.length} unique themes across ${shardsRun} shards covering ${usedChunks.size} corpus chunks.`);
        return { themes: allThemes, methodology: methodology || `Sharded breadth across ${shardsRun} relevance-ranked corpus windows (${usedChunks.size} chunks), unioned and deduped to ${allThemes.length} themes.` } as any;
    }

    /**
     * 2026-06-08 - LEGACY-CORPUS sharded breadth. The fresh-run twin of
     * _runShardedBreadth: when the MCR catalog is empty (fresh/upload runs, where
     * collected articles are not engagement-scoped), the corpus lives in
     * this.corpusFileParts. A single one-shot over ALL parts collapses Gemini 3.1
     * Pro (the 38-theme / 453s / 927KB failure). This packs the parts into
     * ~30K-token windows (mirroring the proven MCR SHARD_TOKENS) and runs breadth
     * in parallel waves over EVERY window, unioning + deduping by theme name. Each
     * shard's prompt is just objective-anchor + the breadth prompt; the window's
     * corpus parts ARE its evidence (no 800KB goal-evidence block per shard).
     * Returns unioned themes, or null if every shard failed (caller single-passes).
     */
    private async _runShardedBreadthFromCorpus(prompt: string, schema: Schema, onStream: (t: string) => void, label: string, goalEvidenceBlock: string, substrateBlock: string): Promise<StepResult_Themes | null> {
        // 2026-06-08 - Window reduced 120K -> 80K chars (~20K tokens, BELOW the MCR
        // path's proven 30K-token shard). The 2026-06-08 alumni run collapsed 2 of 4
        // 120K-char shards (LP1: ". . ." x35; LP4: "1111" x66) -> union fell to 13
        // themes. Smaller windows produce smaller output JSON, which materially lowers
        // the odds of entering Gemini 3.1 Pro's repetition basin. Residual collapses
        // are recovered per-shard on GPT-5.5 in _runBreadthShard, so a shard that still
        // degenerates contributes its themes instead of 0.
        const WINDOW_CHARS = 80_000;    // ~20K tokens/shard (was 120K; halved collapse pressure)
        const WAVE_SIZE = 2;            // shards per parallel wave (2026-06-16: capped 3->2; see note
                                       // in _runShardedBreadth - 3 concurrent ~780KB Opus shards
                                       // saturated the single-process proxy with ERR_EMPTY_RESPONSE)
        const SAFETY_MAX_SHARDS = 8;    // 2026-06-20 COST GUARD: lowered 14->8. With the
                                        // 120KB evidence cap in _runBreadthPass this path
                                        // rarely runs at all; 8 is the hard ceiling on premium
                                        // Pro calls per breadth pass if it ever does.
        // The collapse-driving bulk is the EVIDENCE TEXT (goal-evidence pack +
        // substrate). Combine, then split into size-bounded windows on chunk/
        // paragraph boundaries so each shard sees coherent, intact evidence.
        const evidenceText = [goalEvidenceBlock || '', substrateBlock || ''].filter(s => s && s.trim().length > 0).join('\n\n');
        if (evidenceText.length <= WINDOW_CHARS) return null;   // small enough for one-shot; no collapse risk
        // Split on blank-line boundaries (chunk separators); greedily pack into windows.
        const blocks = evidenceText.split(/\n\s*\n/);
        const windows: string[] = [];
        let cur = '';
        for (const b of blocks) {
            if (cur.length > 0 && cur.length + b.length + 2 > WINDOW_CHARS) { windows.push(cur); cur = ''; }
            cur = cur ? `${cur}\n\n${b}` : b;
            // a single block bigger than the window: hard-split it so no shard is oversized
            while (cur.length > WINDOW_CHARS) { windows.push(cur.slice(0, WINDOW_CHARS)); cur = cur.slice(WINDOW_CHARS); }
        }
        if (cur.trim().length > 0) windows.push(cur);
        if (windows.length <= 1) return null;   // single window == one-shot; let the single-pass handle it
        const anchor = this.buildObjectiveAnchor();
        // Small corpusFileParts (if any) ride along in every shard - they're the
        // client uploads / file corpus, cheap to include and shouldn't be lost.
        const fileParts = (this.corpusFileParts && this.corpusFileParts.length > 0) ? this.corpusFileParts : [];
        const seen = new Set<string>();
        const allThemes: any[] = [];
        let methodology = '';
        let anyOk = false;
        let shardsRun = 0;
        // Cover EVERY window (capped at SAFETY_MAX_SHARDS). Windows are corpus-order
        // (not relevance-ranked), so we do NOT early-saturate - covering all windows
        // maximizes breadth, which is the goal.
        const capped = windows.slice(0, SAFETY_MAX_SHARDS);
        for (let base = 0; base < capped.length; base += WAVE_SIZE) {
            const waveWindows = capped.slice(base, base + WAVE_SIZE);
            onStream(`[${label}] Legacy-corpus breadth wave ${Math.floor(base / WAVE_SIZE) + 1}: ${waveWindows.length} shard(s) in parallel (evidence too large for one-shot; sharding to avoid Pro collapse)...`);
            const results = await Promise.all(waveWindows.map((win, i) => {
                const eff = [anchor, win, prompt].filter(s => s && s.length > 0).join('\n');
                // 2026-06-20 COST GUARD: only the FIRST shard carries the client-upload
                // file parts. Previously EVERY shard re-sent them, so uploaded PDFs were
                // re-billed to premium Gemini 3.1 Pro up to (shards x floor-retry) times.
                // One shard seeing the uploads is enough for breadth; the rest ground on
                // the windowed evidence text.
                const shardParts = (base === 0 && i === 0 && fileParts.length > 0)
                    ? [...fileParts, { text: eff }]
                    : [{ text: eff }];
                return this._runBreadthShard([{ role: 'user', parts: shardParts }], eff, schema, onStream, `${label}-LP${shardsRun + i + 1}`);
            }));
            shardsRun += waveWindows.length;
            let waveNew = 0;
            for (const r of results) {
                if (!r || !Array.isArray((r as any).themes)) continue;
                anyOk = true;
                if (!methodology && (r as any).methodology) methodology = (r as any).methodology;
                for (const t of (r as any).themes) {
                    const key = String(t?.name || '').trim().toLowerCase();
                    if (key && !seen.has(key)) { seen.add(key); allThemes.push(t); waveNew++; }
                }
            }
            console.log(`[${label}] legacy-corpus breadth wave: +${waveNew} new themes (total ${allThemes.length}); shards run=${shardsRun}/${capped.length} of ${windows.length} windows`);
            onStream(`[${label}] Wave: +${waveNew} new themes (running total ${allThemes.length}).`);
            if (waveNew > 0) { try { this.onThemeProgress?.(allThemes.slice()); } catch { /* non-fatal */ } }
        }
        if (!anyOk || allThemes.length === 0) return null;
        console.log(`[${label}] Legacy-corpus sharded breadth complete: ${allThemes.length} unique themes across ${shardsRun} shards (${windows.length} evidence windows).`);
        onStream(`[${label}] Legacy-corpus sharded breadth: ${allThemes.length} unique themes across ${shardsRun} evidence windows.`);
        return { themes: allThemes, methodology: methodology || `Sharded breadth across ${shardsRun} evidence windows, unioned and deduped to ${allThemes.length} themes.` } as any;
    }

    /**
     * 2026-04-29 - PASS 2 DEPTH ENRICHMENT.
     *
     * Per-theme parallel fan-out to Claude Opus 4.7. Each theme gets its own
     * context (name, description, citations, research goal) and Opus emits
     * the depth fields: subThemes, dimensions, contradictions, temporalArc,
     * implications. The breadth fields (name/description/quote/citations/
     * isCrossDocument/status/goalAlignment) pass through untouched.
     *
     * Concurrency: BATCH_SIZE in flight at once. With 30 themes × ~$0.35 each,
     * a typical run costs ~$10 in depth enrichment - keep within budget by
     * either lowering BATCH_SIZE for rate limiting or by gating enrichment
     * to top-N themes by goalAlignment if cost becomes a concern.
     *
     * Failure isolation: a single failed theme does NOT block the others. The
     * failed theme returns with its breadth fields only.
     */
    private async _enrichThemesDepth(themes: any[], onStream: (t: string) => void): Promise<any[]> {
        const BATCH_SIZE = 5;
        const enriched: any[] = new Array(themes.length);
        let completed = 0;

        for (let i = 0; i < themes.length; i += BATCH_SIZE) {
            const batch = themes.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map((theme, batchIdx) => {
                const absoluteIdx = i + batchIdx;
                return this._enrichSingleThemeDepth(theme, absoluteIdx)
                    .then(depthFields => {
                        completed += 1;
                        onStream(`[Themes] Enriched ${completed}/${themes.length}: ${(theme.name || '').slice(0, 60)}`);
                        return { ...theme, ...depthFields };
                    })
                    .catch(err => {
                        completed += 1;
                        console.warn(`[Themes] Depth enrichment failed for theme ${absoluteIdx} ("${(theme.name || '').slice(0, 50)}"):`, err?.message || err);
                        // Return breadth-only theme so deliverable still works
                        return { ...theme, subThemes: [], dimensions: [], contradictions: [], implications: [] };
                    });
            }));
            for (let k = 0; k < results.length; k++) {
                enriched[i + k] = results[k];
            }
        }
        return enriched;
    }

    /**
     * Single-theme depth call.
     *
     * 2026-05-03 - Migrated from Claude Opus 4.7 to Gemini 3.1 Pro Preview.
     * Same JSON schema, same prompt, ~1/8 the cost. The depth output is a
     * structured object with subThemes, dimensions, contradictions,
     * temporalArc, implications - all things Gemini Pro produces well in
     * its `responseMimeType: application/json` mode.
     */
    /**
     * 2026-06-02 - Single quality chokepoint for EVERY generated deliverable.
     * (#2) Hard-rule citation grounding: blank any quote not in the corpus,
     *      across all fields, deliverable-agnostic. ONE rule, not per-artifact.
     * (#4) Self-improvement critic: invoke the previously-orphaned discriminator
     *      so each run scores whether its active constraints actually helped and
     *      auto-dismisses constraints with persistently negative impact -- the
     *      loop that was built (improvementDiscriminator) but never wired.
     * Fire-and-forget; never throws into the generation path.
     */
    private _finalizeDeliverable(kind: string, result: any): void {
        // 2026-06-11 - universal em-dash sweep BEFORE grounding/scoring. The
        // themes run persisted 858 em-dashes (quality 69/100, em_dash_absent
        // failure) because the strip only existed on the slide pipeline, not
        // on deliverable JSON. Walk every string field; pointer-bearing fields
        // (chunk ids, citations) are untouched - stripEmDashes only rewrites
        // U+2014/U+2013, never ASCII hyphens (standing rule) or paths.
        try {
            const dashRe = /[—–]/;
            const sweep = (v: any): any => {
                if (typeof v === 'string') {
                    if (!dashRe.test(v)) return v;
                    return v.replace(/\s*—\s*/g, '; ').replace(/\s*–\s*/g, '-');
                }
                if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = sweep(v[i]); return v; }
                if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = sweep(v[k]); return v; }
                return v;
            };
            sweep(result);
        } catch (e: any) {
            console.warn(`[${kind}] em-dash sweep failed (non-fatal):`, e?.message || e);
        }

        // (#2 / A1) universal hard-rule citation grounding + (A3) fabrication gate.
        try {
            const g = verifyDeliverableCitations(result, this.corpusGroundingText);
            if (g.corpusMismatch) {
                // Safety valve fired: almost nothing matched -> the verification
                // corpus does not align with what this deliverable was generated
                // from. Quotes are PRESERVED. This is a wiring gap (grounding text
                // != generation corpus), NOT model fabrication. Do not alarm.
                console.warn(`[${kind}] citation grounding INCONCLUSIVE: only ${g.grounded}/${g.checked} quotes matched the verification corpus -- quotes PRESERVED (grounding text not aligned with this deliverable's source; no blanking)`);
            } else if (g.checked > 0) {
                console.log(`[${kind}] citation grounding: ${g.grounded}/${g.checked} quotes grounded, ${g.blanked} fabricated blanked`);
                // A3 (reliability) - corpus aligns AND a real chunk of quotes are
                // still unverified => genuine fabrication signal.
                if (g.checked >= 4 && g.blanked / g.checked >= 0.5) {
                    console.warn(`[${kind}] GROUNDING ALERT: ${g.blanked}/${g.checked} quotes were NOT in the corpus (likely fabrication) -- review this deliverable`);
                }
            } else if (g.skippedNoCorpus) {
                console.warn(`[${kind}] citation grounding skipped: corpus grounding text too small to verify`);
            }
        } catch (e: any) {
            console.warn(`[${kind}] citation grounding failed (non-fatal):`, e?.message || e);
        }

        // (reliability + quality gate) - wire the orphaned deliverableScorer (the
        // rubric reward the master plan flagged for H5; it existed with ZERO callers).
        // Score every deliverable; loud alert below the pass bar.
        try {
            const SCORER_KIND: Record<string, string> = {
                personas: 'persona', recommendations: 'recommendation', gap: 'gap-analysis',
                tech_audit: 'tech-audit', journey: 'journey', competitive: 'competitive', themes: 'meta-themes',
            };
            const sk = (SCORER_KIND[kind] || kind) as ScorerKind;
            const score = scoreDeliverable(JSON.stringify(result || {}).slice(0, 200_000), sk);
            console.log(`[${kind}] quality score: ${(score.composite * 100).toFixed(0)}/100${score.failures.length ? ` | failures: ${score.failures.slice(0, 3).join('; ')}` : ''}`);
            if (score.composite < 0.6) {
                console.warn(`[${kind}] QUALITY ALERT: composite ${(score.composite * 100).toFixed(0)}/100 below pass bar -- ${score.failures.slice(0, 4).join('; ')}`);
            }
        } catch (e: any) {
            console.warn(`[${kind}] deliverable scorer failed (non-fatal):`, e?.message || e);
        }

        // (B1 / consistency) - prove the cognitive chain FIRED: each recommendation
        // should reference an upstream theme or persona pain by name, not re-derive.
        if (kind === 'recommendations') {
            try { this._assertChainCoverage(result); } catch { /* non-fatal */ }
        }

        // (#4 / C1+C2 self-improvement) - wire the critic AND surface its actions.
        try {
            const content = JSON.stringify(result || {}).slice(0, 200_000);
            const rec = discriminate({
                artifactKind: kind,
                artifactId: `${kind}_${Date.now()}`,
                timestamp: Date.now(),
                content,
                activeConstraints: snapshotActiveConstraints(kind),
            });
            // C2 - loud signal when the loop self-corrects (retires a bad constraint).
            if (rec && Array.isArray(rec.dismissedThisRun) && rec.dismissedThisRun.length) {
                console.warn(`[self-improvement] auto-retired ${rec.dismissedThisRun.length} constraint(s) with persistently-negative impact: ${rec.dismissedThisRun.join(' | ')}`);
            }
        } catch (e: any) {
            console.warn(`[${kind}] improvement discriminator failed (non-fatal):`, e?.message || e);
        }
    }

    /**
     * B1 (consistency) - runtime assertion that the cognitive chain actually fed
     * the recommendations: count how many recs reference an upstream theme name or
     * persona pain label. Injection (U1) puts the analysis in the prompt; THIS
     * proves the model used it. Zero linkage => loud alert.
     */
    private _assertChainCoverage(result: any): void {
        const recs = Array.isArray(result?.recommendations) ? result.recommendations : [];
        if (!recs.length) return;
        const names: string[] = [];
        for (const t of (this.lastThemes || [])) {
            const n = (t?.name || '').toString().toLowerCase().trim();
            if (n.length > 4) names.push(n);
        }
        for (const p of (this.lastPersonas || [])) {
            for (const pp of (p?.painPoints || [])) {
                const l = (pp?.label || '').toString().toLowerCase().trim();
                if (l.length > 4) names.push(l);
            }
        }
        if (!names.length) return;   // standalone call, nothing to assert against
        let linked = 0;
        for (const r of recs) {
            const blob = `${r?.title || ''} ${r?.description || ''} ${r?.evidenceBasis || ''}`.toLowerCase();
            if (names.some(n => blob.includes(n))) linked++;
        }
        console.log(`[recommendations] cognitive chain coverage: ${linked}/${recs.length} recs reference an upstream theme/persona pain`);
        if (linked === 0) {
            console.warn(`[recommendations] CHAIN ALERT: no recommendation references any upstream theme/pain -- the chain may not be grounding the recs`);
        }
    }

    private async _enrichSingleThemeDepth(theme: any, idx: number): Promise<{
        subThemes: any[]; dimensions: any[]; contradictions: any[];
        temporalArc?: any; interpretation: string[]; implications: string[];
    }> {
        const citations = Array.isArray(theme.citations) ? theme.citations : [];

        // Build per-citation context for Opus. Each citation contributes its
        // verbatim quote, source name, and date - enough for Opus to reason
        // about temporal arc, contradictions, and dimensional variance without
        // needing the full chunk body.
        const citationLines = citations.slice(0, 30).map((c: any, ci: number) => {
            const src = c.sourceName || c.sourceFile || '(unattributed)';
            const date = c.publicationDate ? ` · ${c.publicationDate}` : '';
            const author = c.author ? ` · ${c.author}` : '';
            const quote = (c.text || '').replace(/\s+/g, ' ').slice(0, 280);
            return `  [${ci}] ${src}${author}${date}\n      "${quote}"`;
        }).join('\n');

        const sysPrompt = `You are a senior research analyst at a top-tier consulting firm (McKinsey/BCG/Deloitte caliber) performing DEPTH analysis on a strategic theme that has already been extracted by a separate breadth-extraction model. Your job is to populate the analytical depth fields a senior partner would expect on a polished consulting deliverable: sub-pattern decomposition, organizing axes, named contradictions, temporal arc, and concrete consultant-grade implications.

You will receive ONE theme with its name, description, primary quote, and citations. You will return a JSON object with five depth fields. You DO NOT modify any of the breadth fields. You DO NOT invent citations beyond what was given.

OUTPUT JSON SCHEMA - return EXACTLY this shape:
{
  "subThemes": [
    { "name": "string", "description": "1-2 sentences", "citationIndices": [0, 2] }
    // 2-5 entries. citationIndices reference into the parent citations[] array.
  ],
  "dimensions": [
    { "axis": "string (the organizing axis)", "values": ["concrete value 1", "concrete value 2", "..."] }
    // 2-4 entries. Examples of axes: institution_size, channel, donor_segment,
    // geography, timeframe, role, decision_maker_seniority, technology_maturity.
  ],
  "contradictions": [
    { "claim": "string", "counterClaim": "string", "sources": ["sourceName"], "counterSources": ["sourceName"], "resolution": "1-sentence synthesis or 'unresolved'" }
    // 0-3 entries. Empty array if no genuine contradiction in evidence.
  ],
  "temporalArc": {
    "pre2024": "1 sentence on prior state (omit field if no historical evidence)",
    "in2024_2025": "what shifted",
    "in2025_2026": "current state with citation reference",
    "forwardSignal": "1 sentence on near-future direction the evidence implies"
  },
  "interpretation": [
    "Analytical sentence: what this pattern MEANS for the research objective, why it matters, or what tension/implication it surfaces. NOT a recommendation, NOT an action."
    // 2-4 entries. This is a FINDING's significance, not a to-do. BAD (recommendation, belongs in the recommendations deliverable): "Pilot AI-summarized donor history in 1-2 pods within Q3." GOOD (interpretation): "The convergence of practitioner frustration and vendor consolidation signals that buyers now treat manual workflows as the default failure mode, not an acceptable baseline."
  ]
}

CRITICAL RULES:
- NEVER fabricate sources, dates, or statistics not present in the citations.
- NEVER write meta-commentary about the corpus, the dataset, or this analysis itself.
- NEVER use the banned phrases (paradigm shift, game-changer, holistic approach,
  cutting-edge, leverage synergies, robust solution, seamless integration, in today's
  rapidly evolving landscape, it's important to note, at the end of the day, deep dive
  as filler, low-hanging fruit, etc.).
- subThemes are DISTINCT mechanisms / verbs / sub-patterns inside the umbrella theme.
  If the umbrella is "AI-driven matching reshapes high-value deal workflows", sub-themes
  are concrete sub-patterns like "wealth-screening models replace manual prospect research",
  "predictive next-best-action queues for gift officers", "AI-summarized donor history
  in CRM record views" - NOT generic restatements of the umbrella.
- dimensions are EXPLICIT ANALYTICAL AXES with concrete values found in the evidence,
  NOT a flat tag list. Each axis is a way the theme varies.
- contradictions are GENUINE conflicts in the evidence, not rhetorical foils.
- interpretation explains what the pattern MEANS for the research objective - the
  analytical significance of the finding. It is DESCRIPTIVE/ANALYTICAL, never
  prescriptive. ABSOLUTELY NO recommendations, action verbs ("pilot", "implement",
  "adopt", "launch", "should"), or to-dos - those belong in the recommendations
  deliverable, not in a theme. A theme is a FINDING; this field explains why the
  finding matters, not what to do about it.

Return ONLY the JSON object - no preamble, no markdown fences, no trailing prose.`;

        const userPrompt = `RESEARCH GOAL: "${this.goal}"

THEME #${idx + 1}: ${theme.name}

DESCRIPTION: ${theme.description}

PRIMARY QUOTE: "${theme.quote || ''}"

GOAL ALIGNMENT (breadth model's score): ${theme.goalAlignment ?? 'unscored'} / 100

CITATIONS (${citations.length} total, indices 0-based):
${citationLines || '  (no citations attached)'}

Now produce the depth JSON object per the schema in your system instructions.`;

        // 2026-05-03 - Direct Gemini Pro call. Uses Gemini's native
        // responseMimeType:application/json for strict JSON output. The
        // prior Anthropic-routed implementation has been removed from this
        // branch (HiC-Gemini-Primary).
        let depth: any = null;
        try {
            // W4 — THEME SYNTHESIS CACHE (2026-06-28, model-usage-optimization §2 W4).
            // Per-theme depth ENRICHMENT is the temp-0 (+seed 42) DETERMINISTIC
            // sub-step of theme synthesis. Its prompt is built ONLY from stable,
            // already-finalized inputs (theme name/description/quote/citations + the
            // research goal), so the same corpus+goal re-run produces a BYTE-IDENTICAL
            // request body. Routing it through the proxy `/api/ai/gemini` chokepoint
            // (was a direct @google/genai SDK call that bypassed the cache) makes it
            // exact-cache eligible -> re-runs replay the stored synthesis at $0 and
            // skip the provider call. The temp-0.2/0.4 DIVERSITY/breadth passes are
            // deliberately NOT routed here (VS needs variation). Invalidation is
            // implicit: any wiki write that changes a theme changes the prompt body
            // -> new key -> miss. Fail-open via the surrounding try/catch.
            const { callAIWithRetry } = await import('./aiRetryClient');
            const response: any = await callAIWithRetry('gemini', {
                model: 'gemini-3.1-pro-preview',
                contents: [{
                    role: 'user',
                    parts: [{ text: `SYSTEM:\n${sysPrompt}\n\nUSER:\n${userPrompt}` }],
                }],
                config: {
                    temperature: 0,  // 2026-06-02 determinism-first: depth enrichment deterministic per theme
                    seed: 42,
                    maxOutputTokens: 8000,
                    responseMimeType: 'application/json',
                },
            }, { label: 'themes:depth (Gemini Pro)', maxAttempts: 3, requestTimeoutMs: 180_000 });
            // Synthesize the SDK `.text` convenience field from the proxy's raw
            // Gemini REST shape (candidates[0].content.parts[].text).
            if (response && typeof response.text !== 'string') {
                const _parts = response?.candidates?.[0]?.content?.parts || [];
                response.text = _parts.filter((p: any) => typeof p?.text === 'string').map((p: any) => p.text).join('\n');
            }
            recordDirectGeminiCall('themes:depth', 'gemini-3.1-pro-preview', response);
            const rawText = response.text || '';
            try {
                depth = JSON.parse(rawText);
            } catch {
                depth = JSON.parse(tryRepairJson(rawText));
            }
        } catch (err: any) {
            console.warn(`[ThemeDepth] Gemini Pro depth call failed for theme ${idx}, returning empty depth:`, err?.message || err);
            depth = null;
        }

        // Defensive defaults - model may omit empty arrays.
        // 2026-06-02 - DE-CONFLATION: the depth field is now `interpretation`
        // (analytical significance of the finding), NOT `implications`
        // (recommendations). Accept either key from the model for resilience,
        // and expose it under BOTH `interpretation` (new) and `implications`
        // (legacy renderers) so the analytical text renders without a rename
        // sweep. The CONTENT is now interpretive, not prescriptive.
        const interp = Array.isArray(depth?.interpretation)
            ? depth.interpretation.filter((i: any) => typeof i === 'string')
            : (Array.isArray(depth?.implications) ? depth.implications.filter((i: any) => typeof i === 'string') : []);
        return {
            subThemes: Array.isArray(depth?.subThemes) ? depth.subThemes : [],
            dimensions: Array.isArray(depth?.dimensions) ? depth.dimensions : [],
            contradictions: Array.isArray(depth?.contradictions) ? depth.contradictions : [],
            temporalArc: depth?.temporalArc && typeof depth.temporalArc === 'object' ? depth.temporalArc : undefined,
            interpretation: interp,
            implications: interp,
        };
    }

    /** Tier C2 wiki persistence - synthesizes the theme output into a markdown
     * article and POSTs it to /api/wiki/write-article. Uses kind="synthesis"
     * so the chunked store auto-embeds it on next backfill. The article is
     * goal-aligned (relevanceScore=100, engagementGoal=this.goal) so future
     * goal-blended retrieval surfaces it preferentially. */
    private async _persistThemesToWiki(result: StepResult_Themes): Promise<void> {
        if (!result?.themes || result.themes.length === 0) return;
        const PROXY = (process.env.VITE_PROXY_URL as string) || 'http://127.0.0.1:5012';
        const ts = new Date().toISOString();
        const slug = engagementSlugFor(this.goal);
        const isoDate = ts.slice(0, 10);

        // Render each theme as a markdown section. The chunker will split on
        // h2/h3 boundaries so each theme becomes its own retrievable chunk
        // (or a small handful of chunks for theme bodies that exceed 512 tok).
        const lines: string[] = [];
        lines.push(`# Theme Synthesis - ${this.goal}\n`);
        lines.push(`Generated: ${ts}`);
        lines.push(`Themes: ${result.themes.length}`);
        if (result.methodology) lines.push(`\n## Methodology\n\n${result.methodology}`);

        for (let i = 0; i < result.themes.length; i++) {
            const theme: any = result.themes[i];
            lines.push(`\n## ${i + 1}. ${theme.name || 'Untitled'}`);
            if (typeof theme.goalAlignment === 'number') {
                lines.push(`*Goal alignment: ${Math.round(theme.goalAlignment)}/100 · status: ${theme.status || 'unspecified'}*\n`);
            } else if (theme.status) {
                lines.push(`*status: ${theme.status}*\n`);
            }
            if (theme.description) lines.push(theme.description);
            if (theme.quote) lines.push(`\n> "${theme.quote}"`);

            if (Array.isArray(theme.subThemes) && theme.subThemes.length > 0) {
                lines.push(`\n### Sub-themes`);
                for (const sub of theme.subThemes) {
                    lines.push(`- **${sub.name}** - ${sub.description || ''}`);
                }
            }

            if (Array.isArray(theme.dimensions) && theme.dimensions.length > 0) {
                lines.push(`\n### Dimensions`);
                for (const dim of theme.dimensions) {
                    const vals = Array.isArray(dim.values) && dim.values.length > 0
                        ? ` - ${dim.values.join(', ')}` : '';
                    lines.push(`- **${dim.axis}**${vals}`);
                }
            }

            if (Array.isArray(theme.contradictions) && theme.contradictions.length > 0) {
                lines.push(`\n### Contradictions`);
                for (const c of theme.contradictions) {
                    lines.push(`- **Claim:** ${c.claim}`);
                    lines.push(`  **Counter:** ${c.counterClaim}`);
                    if (c.resolution) lines.push(`  **Synthesis:** ${c.resolution}`);
                }
            }

            if (theme.temporalArc) {
                const arc = theme.temporalArc;
                const periods = [
                    arc.pre2024 && `**Pre-2024:** ${arc.pre2024}`,
                    arc.in2024_2025 && `**2024-2025:** ${arc.in2024_2025}`,
                    arc.in2025_2026 && `**2025-2026:** ${arc.in2025_2026}`,
                    arc.forwardSignal && `**Forward signal:** ${arc.forwardSignal}`,
                ].filter(Boolean);
                if (periods.length > 0) {
                    lines.push(`\n### Temporal arc\n\n${periods.join('  \n')}`);
                }
            }

            if (Array.isArray(theme.implications) && theme.implications.length > 0) {
                lines.push(`\n### Implications`);
                for (let j = 0; j < theme.implications.length; j++) {
                    lines.push(`${j + 1}. ${theme.implications[j]}`);
                }
            }

            if (Array.isArray(theme.citations) && theme.citations.length > 0) {
                lines.push(`\n### Citations (${theme.citations.length})`);
                for (const cit of theme.citations) {
                    const sourceName = cit.sourceName || cit.sourceFile || 'unknown';
                    const text = (cit.text || '').slice(0, 200);
                    const url = cit.url ? ` ([source](${cit.url}))` : '';
                    lines.push(`- *${sourceName}* - "${text}"${url}`);
                }
            }
        }

        const body = lines.join('\n');
        const url = `nxt://synthesis/themes/${slug}/${ts}`;  // synthetic URL - unique per run

        // 2026-06-05 - Migrated to networkResilient.ts::resilientFetch. The
        // prior bare-fetch dropped the theme-synthesis write on
        // `ERR_NETWORK_CHANGED` with no retry - theme work would have
        // disappeared from the wiki silently if the user changed Wi-Fi
        // mid-run. resilientFetch retries 4× with backoff + jitter.
        try {
            const { resilientFetch } = await import('./networkResilient');
            await resilientFetch(`${PROXY}/api/wiki/write-article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    content: body,
                    source: 'HiC Theme Synthesis',
                    title: `Theme Synthesis (${result.themes.length} themes) - ${this.goal.slice(0, 80)}`,
                    date: isoDate,
                    tier: 1,
                    method: 'synthesis',
                    kind: 'synthesis',
                    relevanceScore: 100,
                    relevanceReason: 'Theme synthesis directly addresses the engagement goal',
                    engagementGoal: this.goal,
                }),
                label: 'wiki-write-article.theme-synthesis',
                note: `themes=${result.themes.length} goal="${this.goal.slice(0, 60)}"`,
                maxRetries: 4,
                initialBackoffMs: 800,
                timeoutMs: 90_000,
            });
            console.log(`[Themes] Persisted synthesis to wiki (kind=synthesis, ${result.themes.length} themes, ${(body.length / 1024).toFixed(1)}KB)`);
        } catch (err: any) {
            console.warn('[Themes] wiki POST exhausted:', err?.message || err);
        }
    }

    async generatePersonas(themesInput: any | undefined, feedback: string | undefined, onStream: (t: string) => void, onStatus: (s: string) => void): Promise<StepResult_Personas> {
        // =====================================================================
        // TWO-PHASE PERSONA GENERATION
        // Phase A: Get persona roster (names, roles, core identity) - lightweight
        // Phase B: Enrich each persona individually - one call per persona
        // This defeats Gemini's output truncation which kills single-call approaches.
        // =====================================================================

        onStatus("Phase A: Identifying Archetypes...");

        // --- PHASE A: Lightweight roster ---
        const rosterPrompt = `STEP 3A: PERSONA ROSTER. Identify as many distinct archetypes as the evidence supports (minimum 4, maximum 8). Let the data determine the count - if the research reveals 7 distinct stakeholder groups, generate 7 personas.

RESEARCH OBJECTIVE: "${this.goal}"

Analyze ALL themes and evidence. Identify personas with DIFFERENT roles, perspectives, and segments. Do not force exactly 5 - use as many as the data warrants within the 4-8 range.
${feedback ? `USER FEEDBACK (follow this direction): "${feedback}"` : ''}

CRITICAL - PERSONA NAMING RULE (NON-NEGOTIABLE):
The "name" field MUST be a descriptive archetype TITLE that captures behavior, attitude, or role posture. NEVER a personal name (no "Sarah Chen", "Marcus Johnson", "Maya Patel", etc.). NEVER a generic placeholder ("Primary Stakeholder", "Key User", "Persona 1").

GOOD archetype titles: "Career-Anxious Career-Switcher", "Time-Starved Frontline Manager", "Skeptical Department Head", "Outcomes-Driven Operations Lead", "Bureaucracy-Weary Middle Manager", "Risk-Averse Compliance Lead"

BAD archetype titles: "Sarah Chen", "Marcus the Manager", "Persona 1", "User A", "Primary Stakeholder", "Key Decision Maker"

The title MUST contain a descriptive adjective + a role/posture noun. Two to five words. No first names. No surnames.

For each persona provide: name (archetype title per rule above), role (professional context), demographics (age range / background, no fabricated names), quote (15-25 word first-person voice), and a one-sentence summary of their core tension.

LANGUAGE RULES (apply to every field):
- Plain, descriptive, professional. No jargon, no metaphors, no hyperbole.
- No "...", no en-dashes (-), no em-dashes used as decoration.
- No "navigate the complexities", "unlock potential", "in today's landscape", "transformative", "revolutionary", "robust", "seamless", "holistic".
- Lead with what the persona does, feels, fears, or wants - in concrete terms.

Output JSON.`;

        const rosterSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                personas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    demographics: { type: Type.STRING },
                    quote: { type: Type.STRING },
                    coreTension: { type: Type.STRING },
                }, required: ["name", "role", "quote", "coreTension"] } }
            },
            required: ["methodology", "personas"]
        };

        const roster = await this.executeStepResilient<{ methodology: string; personas: any[] }>(rosterPrompt, rosterSchema, [], onStream, 'Personas');
        if (!roster.personas || roster.personas.length === 0) {
            roster.personas = [{ name: 'Outcomes-Driven Decision Maker', role: 'Senior leader', demographics: '', quote: '', coreTension: '' }];
        }
        // Defense-in-depth: scrub any first-name/surname patterns the model
        // might have emitted despite the prompt rule. A persona "name" that
        // is a personal name (e.g., "Sarah Chen") is replaced with a generic
        // archetype label derived from the role. This guarantees the user
        // never sees fabricated personal names in titles.
        roster.personas = roster.personas.map((p: any) => {
            const looksLikePersonalName = isLikelyPersonalName(p?.name || '');
            if (looksLikePersonalName) {
                const fallback = p?.role
                    ? `${String(p.role).trim()} Archetype`
                    : 'Primary Archetype';
                return { ...p, name: fallback };
            }
            return p;
        });

        onStream(`Identified ${roster.personas.length} archetypes: ${roster.personas.map(p => p.name).join(', ')}`);

        // --- PHASE B: Enrich each persona individually ---
        // 2026-05-12 - R1 Verbalized Confidence per-persona. The existing
        // `confidenceLevel` (EVIDENCED/PARTIALLY_EVIDENCED/HYPOTHESIS) is a
        // coarse rating retained for legacy consumers. The new
        // `selfAssessment` envelope adds the formal RI-trigger signals (overall
        // high/medium/low + leastDefensibleClaims + rationale). The two coexist;
        // selfAssessment is what the reinforceIfUncertain() wrapper will key
        // off in R3.
        const enrichSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                bio: { type: Type.STRING },
                jtbd: { type: Type.STRING },
                goals: { type: Type.OBJECT, properties: { lifeGoal: {type:Type.STRING}, experienceGoal: {type:Type.STRING}, functionalGoal: {type:Type.STRING} } },
                fiveWs: { type: Type.OBJECT, properties: { who: {type:Type.STRING}, what: {type:Type.STRING}, whenWhere: {type:Type.STRING}, why: {type:Type.STRING} } },
                attributes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, behavior: {type:Type.STRING} }, required: ["name", "behavior"] } },
                motivations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING}, confidence: {type:Type.STRING}, confidenceRationale: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING} }, required: ["label"] } },
                painPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING}, confidence: {type:Type.STRING}, confidenceRationale: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                opportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING}, confidence: {type:Type.STRING}, confidenceRationale: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                confidenceLevel: { type: Type.STRING },
                evidenceCount: { type: Type.NUMBER },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["bio", "jtbd", "goals", "fiveWs", "attributes", "motivations", "painPoints"]
        };

        const enrichedPersonas: any[] = [];

        // 2026-05-31 - Persona Phase B enrichment is a STANDALONE call that
        // previously saw ONLY thin theme citations (3/theme, 150 chars). It got
        // neither the objective anchor nor the objective-keyed goal-evidence pack
        // that themes/recommendations now use, so persona depth was starved. Fetch
        // the goal-evidence pack ONCE (cached) + the objective anchor and inject
        // them into every enrich prompt so personas are grounded in real
        // on-objective evidence, not just theme labels.
        // 2026-06-09 manifest migration: ground personas from wiki+MANIFEST (not embedding-RAG bulk-inject).
        let personaGoalEvidence = '';
        try { personaGoalEvidence = await this.assembleDeliverableCorpus('Personas pain points motivations verbatim quotes', { tokenBudget: 30_000, minDistinctSources: 8 }); } catch { /* best-effort */ }
        const personaObjectiveAnchor = this.buildObjectiveAnchor();

        for (let i = 0; i < roster.personas.length; i++) {
            const p = roster.personas[i];
            onStatus(`Phase B: Enriching ${p.name} (${i + 1}/${roster.personas.length})...`);

            // Use a STANDALONE Gemini call (not the chat session) to avoid context contamination.
            // The chat session accumulates tech arch, audit, journey map context that poisons persona enrichment.
            // BUT: We inject theme evidence so the persona is grounded in actual research data.

            // Gather relevant theme evidence for this persona
            const themes = themesInput?.themes || [];
            const relevantEvidence: string[] = [];
            for (const theme of themes) {
                const citations = (theme.citations || []).slice(0, 3);
                for (const c of citations) {
                    const sourceName = c.sourceName || c.sourceFile || '';
                    const quote = c.text ? `"${c.text.substring(0, 150)}"` : '';
                    if (sourceName || quote) {
                        relevantEvidence.push(`[${sourceName}] ${quote}`);
                    }
                }
            }
            const evidenceContext = relevantEvidence.length > 0
                ? `\nRESEARCH EVIDENCE (from ${themes.length} themes with ${relevantEvidence.length} citations - use these to ground the persona):\n${relevantEvidence.slice(0, 20).join('\n')}\n`
                : '';
            // Phase 1 corpus-identity: the persona model can only quote VERBATIM
            // from these citation snippets (it sees nothing else), so they must be
            // in the verification corpus (closes the 0/26 persona grounding artifact).
            if (relevantEvidence.length) this.registerGroundingText(relevantEvidence.slice(0, 20).join('\n'));

            // Load persona skill for enrichment
            let personaSkill = '';
            try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); personaSkill = await loadSkillPrompt('PERSONAS'); } catch (e) { /* skill unavailable */ }

            // 2026-05-12 - R1 Verbalized Confidence on Phase B enrichment.
            // Per-persona "claim" is the persona itself; per-array-item
            // confidence on motivations / painPoints / opportunities lets the
            // composite RI signal triangulate weak claims. Max-high-fraction
            // is 0.50 (stricter than themes' 0.60) because persona enrichment
            // routinely overstates evidence - most claims are "medium" once
            // honestly calibrated.
            const personaVcDirective = buildVerbalizedConfidenceDirective({
                deliverable: 'persona enrichment',
                claimNoun: 'persona',
                claimNounPlural: 'personas',
                maxHighFraction: 0.50,
            });
            const enrichPrompt = `${personaSkill ? `=== AGENT SKILL: PERSONA ARCHITECT ===\n${personaSkill}\n=== END SKILL ===\n\n` : ''}${personaObjectiveAnchor}${personaGoalEvidence ? personaGoalEvidence + '\n' : ''}${personaVcDirective}\nYou are a CX persona researcher. Research goal: "${this.goal}".

ENRICH this persona with COMPLETE detail grounded in the RESEARCH EVIDENCE provided below. Every pain point, motivation, and opportunity must cite a specific source. Output a JSON object with ALL fields populated.

PERSONA: "${p.name}"
Role: ${p.role}. Demographics: ${p.demographics || 'N/A'}. Core tension: ${p.coreTension || 'N/A'}.
${evidenceContext}
REQUIRED JSON FIELDS (populate EVERY field - empty fields are a failure):
- "bio": 2-3 sentences describing this persona's relationship to the research domain. Reference specific findings from the evidence.
- "jtbd": UNDER 25 WORDS. Canonical format: "When [specific situation], I want [concrete capability], so I can [measurable outcome]." Cut every adjective that doesn't add specificity.
- "goals": { "lifeGoal": "one sentence", "experienceGoal": "one sentence", "functionalGoal": "one sentence" }
  CRITICAL: Put DIFFERENT content in each goal field. lifeGoal = aspirational WHY. experienceGoal = how they want to FEEL. functionalGoal = specific TASK outcome.
- "fiveWs": { "who": "their world and mindset (2-3 sentences with research evidence)", "what": "core tension they face (2-3 sentences citing data)", "whenWhere": "context of interaction", "why": "deeper motivation grounded in evidence" }
  CRITICAL: Each fiveWs field MUST have 2+ sentences. Reference specific research findings. Empty strings are a failure.
- "attributes": [{ "name": "dimension_name", "behavior": "specific observable behavior from research" }] (EXACTLY 6 items)
  CRITICAL: NO numeric scores. Each attribute MUST have a behavioral descriptor that is verifiable against research.
  Example: { "name": "Strategic Thinking", "behavior": "Makes decisions based on 3-5 year institutional impact" }
  NEVER use arbitrary numbers. Behavioral descriptors are verifiable; scores are fabricated.
- "motivations": [{ "label": "motivation name", "quote": "VERBATIM quote from a specific research source", "source": "source name (e.g., 'Industry Trade Press', 'Reddit: r/cscareerquestions', 'OpenAlex: Smith 2024')" }] (3-4 items)
  CRITICAL: Every motivation MUST have a real source name and a direct quote from the evidence. NEVER use generic sources like "research" or "studies."
- "tasks": [{ "label": "task description grounded in research" }] (3-4 items)
- "painPoints": [{ "label": "pain point from evidence", "quote": "VERBATIM quote from a specific source proving this pain", "source": "real source name" }] (3-4 items)
  CRITICAL: Every pain point MUST cite a specific source by name with a direct quote. These are the evidence chains that make personas credible.
- "opportunities": [{ "label": "opportunity from evidence", "quote": "evidence supporting this opportunity", "source": "source name" }] (2-3 items)
- "confidenceLevel": "EVIDENCED" if 70%+ of fields cite specific sources, "PARTIALLY_EVIDENCED" if 40-70%, "HYPOTHESIS" if <40%
- "evidenceCount": actual number of distinct sources cited across all fields`;

            try {
                // Standalone call bypasses the polluted chat session.
                // 2026-06-06 - Bug 2 fix from architecture audit: was using
                // gemini-3.5-flash which 400'd with INVALID_ARGUMENT on
                // EVERY persona enrichment (5/5 failures observed in the
                // 2026-06-06 console log, causing personas to fall back to
                // roster data with 34/100 quality + 0/4 grounded quotes).
                // Switching to gemini-2.5-flash (stable + accepts the
                // responseSchema shape). If the 3.5-flash regression is
                // resolved upstream, this can flip back via aiRouter.
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const enrichResponse = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: { parts: [{ text: enrichPrompt }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: enrichSchema,
                        temperature: 0.2,
                    }
                }), 3, 2000, `Persona Enrichment: ${p.name}`);

                const enrichText = enrichResponse.text || '';
                const cleanedEnrichText = tryRepairJson(enrichText);
                const enriched = JSON.parse(cleanedEnrichText);

                enrichedPersonas.push({
                    name: p.name,
                    role: p.role,
                    demographics: p.demographics || '',
                    quote: p.quote || '',
                    ...enriched,
                });
            } catch (e) {
                console.warn(`Failed to enrich persona ${p.name}, using roster data:`, e);
                enrichedPersonas.push({
                    name: p.name, role: p.role, demographics: p.demographics || '',
                    quote: p.quote || '', bio: p.coreTension || '',
                    jtbd: '', goals: { lifeGoal: '', experienceGoal: '', functionalGoal: '' },
                    fiveWs: { who: '', what: p.coreTension || '', whenWhere: '', why: '' },
                    attributes: [], motivations: [], tasks: [], painPoints: [], opportunities: [],
                    confidenceLevel: 'HYPOTHESIS', evidenceCount: 0,
                });
            }
        }

        // 2026-05-12 - R1 calibration inspection (Phase B). The enrichSchema
        // emits a per-persona selfAssessment envelope; we normalize and log
        // the distribution of overallConfidence across the persona set. If
        // every persona returns "high" we'll see calibration=COLLAPSED in the
        // console and know the directive needs tightening for this surface.
        // Maps each persona to a synthetic { confidence } shape so the shared
        // inspectCalibration helper can score the distribution.
        const personaConfidenceClaims = enrichedPersonas.map(p => ({
            confidence: p?.selfAssessment?.overallConfidence as ('high' | 'medium' | 'low' | undefined),
        }));
        // Aggregate envelope: most-frequent overallConfidence across personas
        // gives us a deliverable-level signal. Empty if nothing emitted.
        const personaSelfAssessments = enrichedPersonas
            .map(p => normalizeSelfAssessment(p?.selfAssessment))
            .filter(Boolean) as Array<NonNullable<ReturnType<typeof normalizeSelfAssessment>>>;
        if (personaSelfAssessments.length > 0) {
            // Roll up: aggregate leastDefensibleClaims across personas
            const aggregate = {
                overallConfidence: (personaSelfAssessments.find(a => a.overallConfidence === 'low')?.overallConfidence
                    || personaSelfAssessments.find(a => a.overallConfidence === 'medium')?.overallConfidence
                    || 'high') as 'high' | 'medium' | 'low',
                leastDefensibleClaims: personaSelfAssessments.flatMap(a => a.leastDefensibleClaims).slice(0, 6),
                rationale: personaSelfAssessments.map(a => a.rationale).filter(Boolean).join(' | ').slice(0, 400),
            };
            inspectCalibration('personas', personaConfidenceClaims, aggregate, 0.50);
            // Write the aggregate to the result for downstream consumers (R3 trigger)
            (enrichedPersonas as any).__aggregateSelfAssessment = aggregate;
        } else {
            inspectCalibration('personas', personaConfidenceClaims, undefined, 0.50);
        }

        // --- POST-PROCESSING: safety defaults + Cooper goal fix ---
        const result: StepResult_Personas = { methodology: roster.methodology, personas: enrichedPersonas };
        result.personas.forEach(p => {
            if (!p.motivations) p.motivations = [];
            if (!p.painPoints) p.painPoints = [];
            if (!p.opportunities) p.opportunities = [];
            if (!p.tasks) p.tasks = [];
            if (!p.fiveWs) p.fiveWs = { who: '', what: '', whenWhere: '', why: '' } as any;
            if (!p.name) p.name = 'Unnamed Persona';

            // COOPER-01: Fix broken Cooper Goal Hierarchy.
            // Model sometimes dumps all 3 goals into lifeGoal as one blob.
            if (p.goals) {
                const life = (p.goals as any).lifeGoal || '';
                const exp = (p.goals as any).experienceGoal || '';
                const func = (p.goals as any).functionalGoal || '';
                const expEmpty = !exp || exp === '--' || exp === '-' || exp.trim() === '';
                const funcEmpty = !func || func === '--' || func === '-' || func.trim() === '';

                if (life && expEmpty && funcEmpty && life.length > 80) {
                    let remaining = life;
                    let extractedExp = '';
                    let extractedFunc = '';

                    const expMatch = remaining.match(/[Ee]xperience\s*[Gg]oal\s*[::\-]\s*/);
                    if (expMatch && expMatch.index !== undefined) {
                        const afterExp = remaining.substring(expMatch.index + expMatch[0].length);
                        remaining = remaining.substring(0, expMatch.index).trim();
                        const funcMatch = afterExp.match(/[Ff]unctional\s*[Gg]oal\s*[::\-]\s*/);
                        if (funcMatch && funcMatch.index !== undefined) {
                            extractedExp = afterExp.substring(0, funcMatch.index).trim();
                            extractedFunc = afterExp.substring(funcMatch.index + funcMatch[0].length).trim();
                        } else {
                            extractedExp = afterExp.trim();
                        }
                    } else {
                        const funcMatch = remaining.match(/[Ff]unctional\s*[Gg]oal\s*[::\-]\s*/);
                        if (funcMatch && funcMatch.index !== undefined) {
                            extractedFunc = remaining.substring(funcMatch.index + funcMatch[0].length).trim();
                            remaining = remaining.substring(0, funcMatch.index).trim();
                        }
                    }
                    const lifeLabel = remaining.match(/^[Ll]ife\s*[Gg]oal\s*[::\-]\s*/);
                    if (lifeLabel) remaining = remaining.substring(lifeLabel[0].length).trim();

                    (p.goals as any).lifeGoal = remaining || life;
                    if (extractedExp) (p.goals as any).experienceGoal = extractedExp;
                    if (extractedFunc) (p.goals as any).functionalGoal = extractedFunc;
                }
            } else {
                (p as any).goals = { lifeGoal: '', experienceGoal: '', functionalGoal: '' };
            }
        });

        // --- PHASE C: Generate portraits ---
        onStatus("Generating Photorealistic Portraits...");
        const personasWithImages = [];
        for (const p of result.personas) {
             onStatus(`Photographing ${p.name}...`);
             // EVIDENCE-GROUNDED DEPICTION (2026-07-10, owner directive, ALL industries/persona
             // types): the portrait honors the persona's OWN corpus-derived fields - the full
             // demographics sentence (age, gender, region, family/work context as evidenced) and
             // an optional depiction field when the generation authored one - not just an age
             // digit. Stated attributes are BINDING on the image; attributes the corpus did not
             // evidence stay unstated and the prompt adds no demographic language of its own.
             const personDesc = [(p as any).depiction, p.demographics, p.role]
                 .filter((s: any) => typeof s === 'string' && s.trim()).join('; ');
             const portraitPrompt = `Professional headshot portrait photograph of this person: ${personDesc || 'a professional'}. Match every age, gender, and appearance attribute stated in that description exactly; do not substitute or reinterpret them; attributes not stated are open. Neutral expression, direct eye contact with camera. Studio lighting with soft key light and subtle fill. Shallow depth of field, clean neutral background. Editorial photography style. Shot on Phase One IQ4 150MP medium format camera, 80mm lens f/2.8. High resolution, photorealistic, NOT illustration, NOT cartoon, NOT clip art, NOT 3D render. Real human face with natural skin texture and lighting.`;
             const url = await generatePortrait(portraitPrompt);
             personasWithImages.push({ ...p, imageUrl: url });
        }
        const finalResult = { ...result, personas: personasWithImages };

        // 2026-05-24 NotebookLM uplift Phase 4.4: stamp reproducibility_hash
        // on personas. Re-running with same corpus + same goal MUST produce
        // identical persona identity (name, role, fiveWs). Portrait URLs are
        // excluded from the hash payload because they're stochastic by design.
        try {
            const { stampReproducibilityHash } = await import('./reproducibilityHash');
            const hashPayload = {
                ...finalResult,
                personas: finalResult.personas.map(p => {
                    const { imageUrl, ...rest } = p as any;
                    return rest;
                }),
            };
            const stamped = stampReproducibilityHash(hashPayload, {
                corpus_items: (finalResult as any).documents || (finalResult as any).corpus_items || [],
                research_goal: this.goal || '',
                deliverable_type: 'personas',
                framework_versions: { 'personas': '1.0' },
            });
            (finalResult as any).reproducibility_hash = (stamped as any).reproducibility_hash;
            (finalResult as any).pipeline_version = (stamped as any).pipeline_version;
            (finalResult as any).stamped_at = (stamped as any).stamped_at;
            console.log(`[Personas] reproducibility_hash=${(finalResult as any).reproducibility_hash}`);
        } catch (err: any) {
            console.warn('[Personas] reproducibility stamp skipped:', err?.message || err);
        }

        // 2026-05-25 - Expert panel: persona-architect + verbatim-quote-auditor
        // (verifies persona.quotes are corpus-grounded per learned constraint
        // "use verbatim excerpts; generic quotes lack authenticity") +
        // evidence-quality-auditor + contradiction-finder.
        try {
            const { runExpertPanel } = await import('./artifactExpertPanel');
            const panelResult = await runExpertPanel<StepResult_Personas>({
                deliverable: finalResult,
                kind: 'persona',
            });
            if (panelResult?.result) {
                onStream(`Persona expert panel: ${panelResult.panel_summary.experts_fired.length} critics fired, ${panelResult.panel_summary.critics_with_edits.length} produced edits ($${panelResult.total_cost_usd.toFixed(3)})`);
                try { this.lastPersonas = Array.isArray(panelResult.result.personas) ? panelResult.result.personas : []; } catch { /* noop */ }  // U1
                this._finalizeDeliverable('personas', panelResult.result);
                return panelResult.result;
            }
        } catch (panelErr: any) {
            console.warn('[Personas] expert panel skipped:', panelErr?.message || panelErr);
        }

        try { this.lastPersonas = Array.isArray(finalResult.personas) ? finalResult.personas : []; } catch { /* noop */ }  // U1
        this._finalizeDeliverable('personas', finalResult);
        return finalResult;
    }

    async generateRecommendations(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Recommendations> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('STRATEGIC_RECS'); } catch (e) { /* skill unavailable */ }

        const evidenceBlock = await this.assembleDeliverableCorpus('Strategic Recommendations', { tokenBudget: 30_000, minDistinctSources: 8 });
        this.registerGroundingText(evidenceBlock);   // Phase 1 corpus-identity: recs quote from this catalog
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // U1 (cognitive chain) - inject the run's ACTUAL themes + persona pain points
        // so recommendations map to the real upstream analysis instead of re-deriving
        // (and possibly fabricating) them. The prompt's "review ALL themes and persona
        // pain points" instruction was previously unbacked by any data. Empty -> omitted.
        // 2026-06-02 - consolidated onto the shared intelligenceShaping helper
        // (shapeUpstreamForRecs), so the staged engine is now the THIRD surface
        // backed by the single canonical shaper rather than its own inline copy.
        let chainBlock = '';
        try {
            chainBlock = shapeUpstreamForRecs(this.lastThemes, this.lastPersonas);
            if (chainBlock) {
                console.log(`[Recommendations] cognitive chain: injected upstream analysis (${(this.lastThemes || []).length} themes, ${(this.lastPersonas || []).length} personas)`);
            } else {
                console.log('[Recommendations] cognitive chain: no upstream themes/personas on session (standalone call) - block omitted');
            }
        } catch (e: any) {
            console.warn('[Recommendations] chain block build failed (non-fatal):', e?.message || e);
        }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: STRATEGY AUTHOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${chainBlock}STEP: STRATEGIC RECOMMENDATIONS. You are a senior management consultant performing problem-solution mapping.

METHODOLOGY:
1. First, review ALL themes and ALL persona pain points identified in previous steps (listed in the UPSTREAM ANALYSIS block above when present)
2. For EACH major problem/challenge/pain point found in the research, generate a targeted strategic recommendation
3. Do NOT generate generic platitudes. Each recommendation must solve a SPECIFIC problem identified in the data.

REQUIREMENTS:
- Generate ONE recommendation per major problem/challenge/pain point identified in the research. Do not cap at an arbitrary number. If the research reveals 12 problems, generate 12 recommendations.
- Title: Active verb + specific outcome (NOT "Enhance X" or "Leverage Y" -- be precise about WHAT changes)
- Description: 50-80 words. Must:
  a) NAME the specific problem being solved (cite the theme or pain point)
  b) CITE the evidence that proves this is a problem [CHUNK_XXX]
  c) DESCRIBE the specific solution approach
  d) QUANTIFY expected impact where possible (%, $, timeframe)
- Impact Level: HIGH = urgent + high ROI, MEDIUM = important but longer timeline, LOW = nice-to-have
- Action Items: 4-5 concrete, specific, assignable next steps. Each starts with a verb. Include WHO should do it.
- citations: Array of 2-4 source names that evidence this recommendation (e.g., "Industry Trade Press", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024")
- evidenceBasis: 1-2 sentences summarizing the specific data that proves this recommendation is needed. Include statistics, quotes, or findings.
- Every recommendation must map to at least one theme or persona pain point

ANTI-PATTERNS (do NOT do these):
- "Proactively engage stakeholders" -- too vague
- "Leverage AI for operational efficiency" -- generic consultant-speak
- "Foster inclusive environments" -- no specificity on HOW

GOOD EXAMPLES:
- "Deploy predictive donor scoring to replace manual prospect identification -- research shows gift officers spend 40% of time on low-potential prospects [CHUNK_012]"
- "Consolidate 15 departmental email tools into unified CRM to eliminate the 'invisible constituent' problem identified across 4 sources [CHUNK_003, CHUNK_017]"

ANTI-FABRICATION (composer rule 8 - applies to every recommendation):
- NEVER invent percentages, dollar amounts, dates, or named entities. If a number is not in the evidence catalog below, do NOT include it. Either find an evidenced number or omit the metric.
- "Reduce churn by 15%" is only acceptable if a source in the catalog supports the 15% figure. Otherwise rewrite directionally, e.g., "Reduce churn measurably."
- NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any QA-style annotation in any user-facing field. The output is a finished consulting deliverable, not an annotated draft. If you cannot evidence a claim, omit the claim - do not announce its absence.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            impactLevel: { type: Type.STRING },
                            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                            citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                            evidenceBasis: { type: Type.STRING }
                        },
                        required: ["title", "description", "impactLevel", "actionItems", "citations", "evidenceBasis"]
                    }
                }
            },
            required: ["methodology", "recommendations"]
        };
        onStream('Phase 1: Generating strategic recommendations...');
        const result = await this.executeStepResilient<StepResult_Recommendations>(prompt, schema, [], onStream, 'Recommendations', /* groundedViaManifest */ true);
        if (!result.recommendations) result.recommendations = [];
        result.recommendations.forEach(r => { if (!r.actionItems) r.actionItems = []; });

        // Phase 1B: Enrich recommendations that have thin evidence (token exhaustion on later recs)
        const thinRecs = result.recommendations.filter(r => !r.citations?.length || !r.evidenceBasis);
        if (thinRecs.length > 0) {
            onStream(`Phase 1B: Enriching ${thinRecs.length} recommendations with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const rec of thinRecs) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: `Enrich this recommendation with evidence from the research corpus.\n\nTitle: ${rec.title}\nDescription: ${rec.description}\nImpact: ${rec.impactLevel}\n\nProvide:\n1. citations: 2-4 source names that evidence this recommendation\n2. evidenceBasis: 1-2 sentences with specific data (numbers, quotes, names)\n3. actionItems: 4-5 specific actions (each starts with verb + WHO + WHAT + WHEN)\n\nOutput JSON with fields: citations (array of strings), evidenceBasis (string), actionItems (array of strings).` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich rec: ${rec.title.substring(0, 30)}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length) rec.citations = enriched.citations;
                    if (enriched.evidenceBasis) rec.evidenceBasis = enriched.evidenceBasis;
                    if (enriched.actionItems?.length > (rec.actionItems?.length || 0)) rec.actionItems = enriched.actionItems;
                } catch (e) { /* non-blocking enrichment */ }
            }
        }

        // 2026-05-24 NotebookLM uplift Wire 5: critic-revise-loop on
        // recommendations. Runs pre-mortem + stakeholder-lens + quantification
        // critics; each emits structured edits which the deterministic revisor
        // applies. Budget capped at $0.50 per loop. Loop iterations + cost
        // surface in degradation_events for the user.
        // Only fires on the FIRST generation pass (not on reinforcement
        // re-asks) to avoid double-running critics on already-revised content.
        if (!feedback && result.recommendations.length > 0) {
            try {
                const { criticReviseLoop, RECOMMENDATIONS_LOOP, makeCorpusEvidenceRetriever } = await import('./criticReviseLoop');
                onStream(`Phase 1C: Critique-revise loop (${RECOMMENDATIONS_LOOP.critics.length} critics, budget $${RECOMMENDATIONS_LOOP.budget_usd?.toFixed(2)})...`);
                // K2 (2026-08-13, WS-K): critics may request fresh corpus evidence for
                // coverage holes; the fetcher rides the standard retrieval spine.
                const _k2Slug = (typeof window !== 'undefined'
                    ? (window as any).__hicCurrentEngagementSlug
                    : undefined) || '';
                const looped = await criticReviseLoop({
                    deliverable: result,
                    ...RECOMMENDATIONS_LOOP,
                    retrieve_evidence: makeCorpusEvidenceRetriever(_k2Slug, (result as any)?.researchGoal || undefined),
                });
                Object.assign(result, looped.result);
                (result as any).degradation_events = [
                    ...(((result as any).degradation_events as any[]) || []),
                    ...looped.degradation_events,
                ];
                console.log(`[Wire 5] critic-revise complete: ${looped.iterations_per_critic ? JSON.stringify(looped.iterations_per_critic) : '{}'}, halted=${looped.halted_reason}, cost=$${looped.total_cost_usd.toFixed(3)}`);
                onStream(`Critique-revise complete: ${looped.halted_reason} ($${looped.total_cost_usd.toFixed(3)})`);
            } catch (e: any) {
                console.warn('[Wire 5] critic-revise-loop skipped (non-fatal):', e?.message || e);
            }
        }

        // 2026-10-01 (plan Stage 2.4): the K3 Flash claims re-read that lived here is deleted.
        // Claims are checked by the ONE ledger as the `claims` stage of the artifact chain
        // (claimStage.ts), which the deliverable path runs with repair (runGatedDeliverables).

        // Validate
        const validation = validateDeliverableOutput(result, 'recommendations');
        if (!validation.valid && !feedback) {
            // 2026-05-23 - P0.2 - Reinforcement Inference. Anchor the prior
            // answer in the re-ask so the regen revises only the failing items
            // instead of starting from scratch.
            const sig = {
                overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                validationFailures: validation.failures,
            };
            console.log(`[Validation] ${validation.failures.length} issues, reinforcing...`);
            onStream(`Quality gate: ${validation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: result, failures: validation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'recommendations' })
                : validation.failures.join('. ');
            await appendUncertaintyLedger({
                deliverableName: 'recommendations',
                timestamp: new Date().toISOString(),
                triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                overallConfidence: sig.overallConfidence,
                leastDefensibleClaims: sig.leastDefensibleClaims,
                validationFailures: sig.validationFailures,
                resolution: 'reinforced',
            });
            return this.generateRecommendations(reinforcedFeedback, onStream);
        }

        // STRAT-01: Generate Rumelt-anchored strategy frame in second pass.
        // The recommendations become the "Coherent Actions" section of Rumelt's Kernel.
        // Phase 2 boilerplate (Vision/Mission/Governance Model/Communication Plan/
        // Change Management) was removed 2026-05-05 - those are strategy-document
        // filler, not research output. The strategic-report-writer manifest
        // covers the same ground with evidence-anchored sections instead.
        const stratPrompt = `STEP: STRATEGY FRAME (research-report style, not corporate-strategy-doc filler). You have generated ${result.recommendations.length} strategic recommendations. Wrap them in a Rumelt-anchored strategy frame that an executive reads BEFORE the recommendation list.

RUMELT'S KERNEL (non-negotiable):
1. DIAGNOSIS: Name THE central challenge. Be specific and evidenced: "[Subject] faces [problem] because [root cause], costing [quantified impact, cited]."
2. GUIDING POLICY: State the strategic approach. Not a goal - a DECISION: "We will [approach], which means choosing [X] over [Y]."
3. COHERENT ACTIONS: The ${result.recommendations.length} recommendations you already generated, grouped into 3-5 MECE strategic pillars.

MANDATORY SECTIONS (generate EXACTLY these - do NOT add Vision/Mission/Governance Model/Communication Plan/Change Management; those are filler):
1. Executive Summary (SCR format - Situation, Complication, Resolution - max 250 words, every claim cited).
2. Diagnosis (Rumelt) - what is broken and WHY, with verbatim evidence from the catalog.
3. Guiding Policy (Rumelt) - the strategic choice that excludes alternatives.
4. Strategic Pillars (3-5 MECE pillars; each pillar is a problem space, not a department).
5. Prioritized Initiatives (group the ${result.recommendations.length} recommendations under pillars; each gets impact + evidence).
6. Quick Wins (3-5 actions achievable in 90 days, each tied to a recommendation already generated).
7. Risk Register (top 5 risks with probability, impact, mitigation - each risk evidenced).
8. Measurement Framework (3-5 leading and lagging KPIs per pillar; each KPI must reference a baseline from the evidence catalog. If a baseline is missing, write the KPI directionally - e.g., "Increase advisor response rate" - without inventing a number).

For sections where evidence is insufficient, write the section narrowly around what IS evidenced, or omit the section entirely. Do NOT include placeholder or QA-annotation language.

ANTI-FABRICATION + ANTI-ANNOTATION (composer rule 8):
- NEVER invent percentages, dollar amounts, or dates. If the catalog does not contain a number for a KPI baseline, write the section without the number.
- NEVER write the literal strings "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any meta-annotation in any user-facing field. The output is a finished consulting deliverable read by executives - not an annotated draft. If a claim is not evidenced, omit the claim, not write a self-reference about its absence.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const stratSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                executiveSummary: { type: Type.STRING },
                diagnosis: { type: Type.STRING },
                guidingPolicy: { type: Type.STRING },
                strategicPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                sections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sectionNumber: { type: Type.INTEGER },
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            evidenceGap: { type: Type.STRING }
                        },
                        required: ["sectionNumber", "title", "content"]
                    }
                }
            },
            required: ["executiveSummary", "diagnosis", "guidingPolicy", "strategicPillars", "sections"]
        };

        try {
            const stratResult = await this.executeStep<any>(stratPrompt, stratSchema, [], onStream);
            result.strategyDocument = {
                executiveSummary: stratResult.executiveSummary || '',
                diagnosis: stratResult.diagnosis || '',
                guidingPolicy: stratResult.guidingPolicy || '',
                strategicPillars: stratResult.strategicPillars || [],
                sections: stratResult.sections || [],
            };
        } catch (e) {
            console.warn('[Strategy] Failed to generate full strategy document:', e);
        }

        // 2026-05-24 NotebookLM uplift Phase 4.4: stamp reproducibility_hash
        // on recommendations so the same corpus + same goal produces the
        // same recommendation set identity. Surfaces in the export ribbon
        // and feeds validate_*_reproducibility audit hooks.
        try {
            const { stampReproducibilityHash } = await import('./reproducibilityHash');
            const stamped = stampReproducibilityHash(result, {
                corpus_items: (result as any).documents || (result as any).corpus_items || [],
                research_goal: this.goal || '',
                deliverable_type: 'recommendations',
                framework_versions: { 'recommendations': '1.0', 'critic_revise': 'enabled' },
            });
            (result as any).reproducibility_hash = (stamped as any).reproducibility_hash;
            (result as any).pipeline_version = (stamped as any).pipeline_version;
            (result as any).stamped_at = (stamped as any).stamped_at;
            console.log(`[Recommendations] reproducibility_hash=${(result as any).reproducibility_hash}`);
        } catch (err: any) {
            console.warn('[Recommendations] reproducibility stamp skipped:', err?.message || err);
        }

        this._finalizeDeliverable('recommendations', result);
        return result;
    }

    async generateCrossCuttingSynthesis(
        themes: any[],
        personas: any[],
        recommendations: any[],
        feedback: string | undefined,
        onStream: (t: string) => void
    ): Promise<StepResult_CrossCuttingSynthesis> {
        const themeNames = themes.map((t: any) => t.name || t.title || 'Unnamed Theme').join(', ');
        const personaNames = personas.map((p: any) => p.name || p.role || 'Unnamed Persona').join(', ');
        const recTitles = recommendations.map((r: any) => r.title || r.name || 'Unnamed Recommendation').join(', ');

        const prompt = `STEP: CROSS-CUTTING STRATEGIC SYNTHESIS. You are a senior strategy partner performing a meta-analysis across ALL deliverables generated so far.

PURPOSE: Look across ALL themes, ALL personas, and ALL recommendations SIMULTANEOUSLY to identify 3-5 cross-cutting strategic insights that no single deliverable captures on its own. These are the "hidden connections" - patterns that only emerge when you hold the entire body of work in view at once.

INPUTS TO SYNTHESIZE:
- THEMES: ${themeNames}
- PERSONAS: ${personaNames}
- RECOMMENDATIONS: ${recTitles}

FOR EACH INSIGHT (generate 3-5):
1. NAME: A concise, memorable name for this cross-cutting insight (e.g., "The Trust-Technology Paradox" or "The Invisible Middle Stakeholder")
2. CONNECTED THEMES: Which specific themes (by name) does this insight draw from?
3. CONNECTED PERSONAS: Which specific personas (by name) does this insight connect?
4. STRATEGIC IMPLICATION: What does this mean for overall strategy? What decision or trade-off does it force? Why does it matter that these elements are connected?
5. EVIDENCE: What specific data points, quotes, or patterns from the research support this connection? Cite [CHUNK_XXX] references where possible.

QUALITY CRITERIA:
- Each insight MUST span at least 2 themes AND at least 1 persona AND at least 1 recommendation
- Insights must reveal non-obvious connections (not just restating a theme)
- Strategic implications must be actionable, not platitudes
- If the research data does not support a genuine cross-cutting insight, generate fewer rather than forcing weak connections

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                insights: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            connectedThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
                            connectedPersonas: { type: Type.ARRAY, items: { type: Type.STRING } },
                            strategicImplication: { type: Type.STRING },
                            evidence: { type: Type.STRING }
                        },
                        required: ["name", "connectedThemes", "connectedPersonas", "strategicImplication", "evidence"]
                    }
                }
            },
            required: ["methodology", "insights"]
        };

        const result = await this.executeStep<StepResult_CrossCuttingSynthesis>(prompt, schema, [], onStream);
        if (!result.insights) result.insights = [];
        return result;
    }

    async generateJourneyMap(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_JourneyMap> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('JOURNEY_MAP'); } catch (e) { /* skill unavailable */ }

        // 2026-06-09 manifest migration: ground from wiki+MANIFEST (not rawSources bulk-inject).
        const evidenceBlock = await this.assembleDeliverableCorpus('Service Blueprint journey stages pain points', { tokenBudget: 30_000, minDistinctSources: 8 });
        this.registerGroundingText(evidenceBlock);   // Phase 1 corpus-identity: journey/blueprint quotes from this catalog
        // 2026-06-09 design-system pull is now carried by assembleDeliverableCorpus (shared chokepoint),
        // so evidenceBlock already includes the brand tokens + element twins + node map. Empty here to
        // avoid double-injecting the (now larger) design block into this one prompt.
        const designSystemBlock = '';
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-12 - R1 Verbalized Confidence on journey/blueprint stages.
        // Per-stage claims (painPoint, fail_point, emotion intensity) often
        // extrapolate beyond the corpus - VC surfaces which stages the model
        // itself flagged as weakest so the RI trigger can re-ask them.
        const journeyVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'service blueprint',
            claimNoun: 'stage',
            claimNounPlural: 'stages',
            maxHighFraction: 0.55,
        });
        const prompt = `${designSystemBlock}${skillInstructions ? `=== AGENT SKILL: SERVICE BLUEPRINT MAPPER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${journeyVcDirective}\nCRITICAL REQUIREMENTS FOR BLUEPRINT QUALITY:

SWIMLANE CELL CONTENT (B-01): Every intersection of [Persona] x [Stage] MUST have content.
For each cell, describe: what this persona does at this stage, their emotional state, and their key need.
If a persona is NOT involved at a stage, write "Not involved" - NEVER leave a cell empty.
Empty cells in a blueprint are worse than no blueprint at all.

FAIL POINTS (B-03): For each stage, identify the most likely failure mode.
Mark with a fail_point field: what fails, estimated frequency, and consequence.
Minimum 1 fail point per 2 stages. These are the highest-value elements of a blueprint.

TECHNOLOGY LAYER (B-05): Add a technology/systems field to each stage.
List the specific systems, platforms, and tools that support each stage.
Example: "the core CRM, data-warehouse integration, AI propensity model"

EMOTION LINE: Each stage must have an emotion field with: emotion name AND intensity score (1-5).
Not just colored dots - named emotions with scores.

STEP: PERSONA-DRIVEN SERVICE BLUEPRINT. You are a senior service designer creating an evidence-based, persona-aware service blueprint.

CRITICAL: This blueprint must map how EACH PERSONA (identified in Step 3) experiences the service differently. A university president navigates the journey differently than a frontline fundraiser or a donor.

METHODOLOGY:
1. Review ALL personas from Step 3 - their roles, pain points, motivations, and tasks
2. Map 5-8 chronological STAGES of the service lifecycle
3. For EACH stage, document how EACH actor (persona) experiences that stage differently

STAGE IDENTIFICATION:
- 5-8 stages covering the FULL lifecycle specific to the research context
- Name stages FROM THE USER'S PERSPECTIVE, not the institution's process.
  BAD: "Initial Engagement & Awareness" (institutional jargon)
  BAD: "Learning & Skill Validation / Solicitation & Commitment" (bureaucratic compound)
  GOOD: "Discovering the opportunity" (user voice)
  GOOD: "Building my profile" (user voice)
  GOOD: "Landing the placement" (user voice)
  GOOD: "Proving what I've built" (user voice)
  Every stage name must pass this test: "Would the persona say this phrase in conversation?"

FOR EACH STAGE, provide ALL of these fields:
- phase: Specific stage name
- actors: Array of persona names involved in this stage (from Step 3 personas). EVERY stage must have at least 1 actor.
- actorNeeds: What each actor needs at this stage (mapped to specific persona pain points)
- actorBehaviors: What each actor actually DOES (from research evidence, not assumptions)
- customerAction: The primary customer/stakeholder action (2-3 sentences with evidence)
- touchpoint: Specific channels (e.g., "CRM dashboard", "donor portal", "face-to-face meeting", "AI recommendation engine")
- frontstageAction: What the organization visibly does (staff actions, system responses)
- backstageAction: Hidden operations (data processing, AI scoring, internal handoffs)
- supportProcesses: Infrastructure and systems enabling this stage
- physicalEvidence: What actors see, hold, or receive (emails, reports, dashboards, proposals)
- emotion: "Delighted" | "Positive" | "Neutral" | "Negative" | "Frustrated" - justified by evidence
- painPoint: Specific friction with [CHUNK_XXX] citation. What breaks, fails, or frustrates?
- opportunityForImprovement: What could be done better (linked to recommendations from Step 5)
- valueProposition: What value is delivered or promised to the actor at this stage
- momentOfTruth: Is this a critical make-or-break moment? (true/false) - moments where the experience succeeds or fails

EVIDENCE GROUNDING:
- EVERY painPoint, actorBehaviors, and emotion must cite [CHUNK_XXX]
- actors must reference persona names from Step 3
- opportunityForImprovement should reference recommendations from Step 5
- citations: For each stage, list 2-4 source names that evidence this stage (e.g., "Industry Trade Press", "Reddit: r/<community>", "OpenAlex: Jones 2024")
- evidenceBasis: 1-2 sentences summarizing the specific research evidence that informed this stage - quote data points, articles, or posts

ANTI-FABRICATION + ANTI-ANNOTATION (composer rule 8): NEVER invent percentages, frequencies, or named systems. If the catalog has no fail-point frequency for a stage, omit the number entirely - describe the failure mode qualitatively. Made-up "42% drop off" anywhere is grounds for rejection. Never write QA-style annotations, debug labels, or "TBD" placeholders in any field - the output is a finished deliverable, not a draft.

JOURNEY MAPPER DEPTH (2026-05-25 - ported from internal-solutions-journeymapper):
The journey artifact must read as a finished consulting report, not a JSON dump. Each stage carries:
  - VERBATIM voiceQuote pulled directly from the corpus, with sourceAttribution (e.g., "r/cscareerquestions, 2024-09"). If no usable verbatim quote exists, OMIT the field - never fabricate.
  - emotionIntensity on a 0-100 scale (NOT 1-5): 0-20 very low, 21-40 low, 41-60 medium, 61-80 high, 81-100 very high.
  - namedTouchpoints array - each entry is { channel: "DIGITAL|IN-PERSON|PHONE|MAIL|SOCIAL|PORTAL|EMAIL", name: "Specific system/interaction", importance: 1-10 }. Importance from corpus where possible.
  - confidence: "verified" | "emerging" | "hypothesis" - calibrated to evidence strength.

JOURNEY-LEVEL DASHBOARD (above the per-stage grid). The output ALSO carries:
  - journeyType: one of "customer-purchase" | "educational" | "coop" | "healthcare" | "employee" | "software-user" | "general", detected from corpus term density.
  - personas: 2-5 goals/JTBD-first persona summaries (NOT demographics-first). Each = { name, role, characterization }.
  - overallPainPoints: 3-5 journey-level patterns (cross-cutting, NOT per-stage). Each carries inline source citation.
  - overallOpportunities: 3-5 high-leverage strategic opportunities. These live HERE, not in body cells.
  - kpiTiles: 3-5 tiles. Each = { value, label, supportingPhase }. value is a real corpus number; if none exists, use a qualitative word in display type ("MULTIPLE", "FRAGMENTED") rather than fabricate.

DEPTH FLOORS (self-check before emitting):
  - ≥40% of stages have voiceQuote (verbatim)
  - ≥60% of stages have at least one namedTouchpoint
  - ≥80% of stages have emotionIntensity + named emotion
  - ≥3 distinct named sources across the whole artifact
If any floor unmet, REGENERATE - never pad with fabricated content.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                // 2026-05-25 - JM-depth dashboard fields. journeyType anchors phase
                // scaffold; personas/overallPainPoints/overallOpportunities/kpiTiles
                // are the journey-level synthesis that the cells roll up into.
                journeyType: { type: Type.STRING },
                personas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    characterization: { type: Type.STRING },
                }, required: ["name", "role", "characterization"] } },
                overallPainPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    pattern: { type: Type.STRING },
                    sourceCitation: { type: Type.STRING },
                }, required: ["pattern", "sourceCitation"] } },
                overallOpportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    opportunity: { type: Type.STRING },
                    sourceCitation: { type: Type.STRING },
                }, required: ["opportunity", "sourceCitation"] } },
                kpiTiles: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    value: { type: Type.STRING },
                    label: { type: Type.STRING },
                    supportingPhase: { type: Type.STRING },
                    isHeadline: { type: Type.BOOLEAN },
                }, required: ["value", "label", "supportingPhase"] } },
                stages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    phase: { type: Type.STRING },
                    actors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    actorNeeds: { type: Type.STRING },
                    actorBehaviors: { type: Type.STRING },
                    customerAction: { type: Type.STRING },
                    touchpoint: { type: Type.STRING },
                    // 2026-05-25 - JM-depth: namedTouchpoints array supplements the legacy
                    // scalar touchpoint field with structured channel + importance.
                    namedTouchpoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        channel: { type: Type.STRING },
                        name: { type: Type.STRING },
                        importance: { type: Type.INTEGER },
                    }, required: ["channel", "name"] } },
                    frontstageAction: { type: Type.STRING },
                    backstageAction: { type: Type.STRING },
                    supportProcesses: { type: Type.STRING },
                    physicalEvidence: { type: Type.STRING },
                    emotion: { type: Type.STRING },
                    // 2026-05-25 - JM-depth: emotionIntensity is now 0-100 (was 1-5).
                    // Backward-compat: renderer treats <=5 as 1-5 scale, >5 as 0-100.
                    emotionIntensity: { type: Type.INTEGER },
                    emotionReason: { type: Type.STRING },
                    painPoint: { type: Type.STRING },
                    // 2026-05-25 - JM-depth: voiceQuote is verbatim corpus text;
                    // sourceAttribution names the specific source + date if known.
                    voiceQuote: { type: Type.STRING },
                    sourceAttribution: { type: Type.STRING },
                    opportunityForImprovement: { type: Type.STRING },
                    valueProposition: { type: Type.STRING },
                    momentOfTruth: { type: Type.BOOLEAN },
                    fail_point: { type: Type.STRING },
                    technologySystems: { type: Type.STRING },
                    citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    evidenceBasis: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    confidenceRationale: { type: Type.STRING }
                }, required: ["phase", "actors", "actorNeeds", "actorBehaviors", "customerAction", "touchpoint", "frontstageAction", "backstageAction", "supportProcesses", "physicalEvidence", "emotion", "painPoint", "opportunityForImprovement", "valueProposition", "momentOfTruth", "fail_point", "technologySystems", "emotionIntensity", "citations", "evidenceBasis"] } },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "stages"]
        };
        const result = await this.executeStepResilient<StepResult_JourneyMap>(prompt, schema, [], onStream, 'ServiceBlueprint', /* groundedViaManifest */ true);
        if (!result.stages) result.stages = [];
        // 2026-05-12 - R1 calibration inspection on journey stages.
        const journeyAssessment = normalizeSelfAssessment((result as any).selfAssessment);
        if (journeyAssessment) (result as any).selfAssessment = journeyAssessment; else delete (result as any).selfAssessment;
        inspectCalibration('journey-map', result.stages as any[], journeyAssessment, 0.55);

        // Phase 2: Enrich stages with thin evidence (token exhaustion on later stages)
        const thinStages = result.stages.filter(s => !s.citations?.length || !s.evidenceBasis || !s.fail_point);
        if (thinStages.length > 0 && result.stages.length > 0) {
            onStream(`Enriching ${thinStages.length} stages with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const stage of thinStages) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: `Enrich this service blueprint stage with evidence.\n\nPhase: ${stage.phase}\nCustomer Action: ${stage.customerAction}\nPain Point: ${stage.painPoint}\nEmotion: ${stage.emotion}\n\nProvide:\n1. citations: 2-4 source names evidencing this stage\n2. evidenceBasis: 1-2 sentences with specific research data\n3. fail_point: What fails at this stage, frequency, consequence\n4. technologySystems: Specific systems/platforms supporting this stage\n\nOutput JSON.` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich stage: ${stage.phase}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length && !stage.citations?.length) stage.citations = enriched.citations;
                    if (enriched.evidenceBasis && !stage.evidenceBasis) (stage as any).evidenceBasis = enriched.evidenceBasis;
                    if (enriched.fail_point && !stage.fail_point) stage.fail_point = enriched.fail_point;
                    if (enriched.technologySystems && !stage.technologySystems) stage.technologySystems = enriched.technologySystems;
                } catch (e) { /* non-blocking */ }
            }
        }

        // Validate
        const validation = validateDeliverableOutput(result, 'journey_map');
        if (!validation.valid && !feedback) {
            // 2026-05-23 - P0.2 - Reinforcement Inference for journey map.
            const sig = {
                overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                validationFailures: validation.failures,
            };
            console.log(`[Validation] ${validation.failures.length} issues, reinforcing...`);
            onStream(`Quality gate: ${validation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: result, failures: validation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'journey_map' })
                : validation.failures.join('. ');
            await appendUncertaintyLedger({
                deliverableName: 'journey_map',
                timestamp: new Date().toISOString(),
                triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                overallConfidence: sig.overallConfidence,
                leastDefensibleClaims: sig.leastDefensibleClaims,
                validationFailures: sig.validationFailures,
                resolution: 'reinforced',
            });
            return this.generateJourneyMap(reinforcedFeedback, onStream);
        }

        // 2026-05-25 - Expert-panel pre-emit pass (JM-depth uplift). Routes the
        // journey through journey-illustrator + verbatim-quote-auditor +
        // evidence-quality-auditor + pre-mortem critics with the criticRevise
        // loop applying their edits before ship. Wrapped in try/catch so a
        // panel failure (e.g., proxy 429 storm) degrades gracefully - the
        // journey still ships, just without the panel's improvements.
        try {
            const { runExpertPanel } = await import('./artifactExpertPanel');
            const panelResult = await runExpertPanel<StepResult_JourneyMap>({
                deliverable: result,
                kind: 'journey',
            });
            if (panelResult?.result) {
                onStream(`Expert panel: ${panelResult.panel_summary.experts_fired.length} critics fired, ${panelResult.panel_summary.critics_with_edits.length} produced edits ($${panelResult.total_cost_usd.toFixed(3)})`);
                this._finalizeDeliverable('journey', panelResult.result);
                return panelResult.result;
            }
        } catch (panelErr: any) {
            console.warn('[generateJourneyMap] expert panel skipped:', panelErr?.message || panelErr);
        }

        // NXT Design System: No decorative AI diagrams. Service blueprints are rendered
        // as structured SVG from the stage data by the frontend component.
        this._finalizeDeliverable('journey', result);
        return result;
    }

    /**
     * Generate an organizational chart artifact matching the OrgChartArtifact
     * shape from design-desk/schemas/orgChartArtifact.ts. The shape is
     * returned inside { orgChart } so App.tsx can hand it to ResultsView and
     * (via the Design Desk handoff) push it into the designDeskStore.
     *
     * Structure mirrors generateJourneyMap:
     *   - prompt references themes/corpus already in the chat session history
     *   - Gemini Schema enforces JSON shape
     *   - executeStepResilient handles Gemini→Claude repetition-collapse fallback
     */
    async generateOrgChart(feedback: string | undefined, onStream: (t: string) => void): Promise<{ orgChart: any }> {
        const now = Date.now();
        // 2026-06-16 - DE-RAG / anti-fabrication. orgChart was the ONLY generator
        // with zero grounding: it relied on chat-session history and was instructed
        // to "infer a plausible structure" when the corpus was silent - a direct
        // fabrication path. Ground it through the manifest like every other
        // deliverable (assembleDeliverableCorpus), and pass groundedViaManifest so
        // executeStep does not re-inject the parallel embedding-RAG packs.
        const evidenceBlock = await this.assembleDeliverableCorpus('Organizational structure reporting lines departments key roles named stakeholders', { tokenBudget: 30_000, minDistinctSources: 6 });
        const prompt = `STEP: ORGANIZATIONAL CHART. You are an organizational designer. Using the EVIDENCE below (manifest-grounded corpus) plus the themes reviewed this session, identify the organizational structure described or implied - reporting lines, departments, key roles, vacancies if mentioned.

${evidenceBlock}

If the evidence describes a specific organization, map what it says explicitly and cite the named sources.
If the evidence does NOT name a specific org, infer a plausible structure ONLY from the themes/personas/evidence context - use role titles and the literal "VACANT" for unfilled roles; never invent named individuals. NEVER return an empty nodes array.

ORG CHART REQUIREMENTS:
- nodes: 5-25 node objects. Each node has:
    id: unique stable string like "n1", "n2" (MUST be unique across all nodes)
    name: person name, or the literal string "VACANT" for unfilled roles
    title: role/job title (e.g. "VP of Advancement", "Director of Annual Giving")
    department: optional department or division name
    directReports: array of node ids this node supervises (empty array if leaf)
    iconKey: one of "person" | "vacant" | "team" | "external"
      - "vacant" for roles marked VACANT
      - "team" for collective/group nodes ("Data Science Team")
      - "external" for partners, vendors, board members outside the org
      - "person" for individuals (default)
- rootIds: array of ids for top-level nodes (usually 1 entry; multiple allowed for federated structures)
- INTEGRITY: Every id in rootIds MUST exist in nodes[]. Every id in any directReports[] MUST exist in nodes[]. No dangling references.
- citations: 2-6 evidence objects. Each has label (fact being cited, e.g. "CRO reports to CEO") and source (named source like "Industry Trade Press" or the uploaded document name).
- title: Action-title describing the org/division (e.g. "University Advancement - 12 roles, 2 vacancies in major gifts").

OUTPUT CONSTANTS (must be exactly as specified):
- id: "o_${now}"
- type: "org"
- brand: "nxt"
- createdAt: ${now}
- updatedAt: ${now}

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Plain text only in every string. No markdown, no emoji. Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                brand: { type: Type.STRING },
                title: { type: Type.STRING },
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    title: { type: Type.STRING },
                    department: { type: Type.STRING },
                    directReports: { type: Type.ARRAY, items: { type: Type.STRING } },
                    iconKey: { type: Type.STRING },
                }, required: ["id", "name", "title", "directReports"] } },
                rootIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                citations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    label: { type: Type.STRING },
                    source: { type: Type.STRING },
                }, required: ["label", "source"] } },
                createdAt: { type: Type.NUMBER },
                updatedAt: { type: Type.NUMBER },
            },
            required: ["id", "type", "brand", "title", "nodes", "rootIds", "createdAt", "updatedAt"],
        };

        const result = await this.executeStepResilient<any>(prompt, schema, [], onStream, 'OrgChart', /* groundedViaManifest */ true);

        // Defensive post-processing: the schema cannot enforce referential
        // integrity, so we repair dangling references before returning.
        const nodeIds = new Set<string>((result?.nodes || []).map((n: any) => n.id));
        for (const n of (result?.nodes || [])) {
            n.directReports = Array.isArray(n.directReports) ? n.directReports.filter((id: string) => nodeIds.has(id)) : [];
            if (!n.iconKey) {
                n.iconKey = (typeof n.name === 'string' && n.name.trim().toUpperCase() === 'VACANT') ? 'vacant' : 'person';
            }
        }
        result.rootIds = Array.isArray(result.rootIds) ? result.rootIds.filter((id: string) => nodeIds.has(id)) : [];
        if (result.rootIds.length === 0 && result.nodes?.length) {
            // Fallback: pick nodes that no one reports to as roots
            const reportedSet = new Set<string>();
            for (const n of result.nodes) for (const r of (n.directReports || [])) reportedSet.add(r);
            result.rootIds = result.nodes.filter((n: any) => !reportedSet.has(n.id)).map((n: any) => n.id);
            if (result.rootIds.length === 0) result.rootIds = [result.nodes[0].id];
        }
        // Hard-set the constants the prompt already asks for (defensive in case
        // the model deviates on type/brand literals).
        result.id = result.id || `o_${now}`;
        result.type = 'org';
        result.brand = 'nxt';
        if (!Array.isArray(result.citations)) result.citations = [];
        result.createdAt = result.createdAt || now;
        result.updatedAt = now;

        return { orgChart: result };
    }

    async generatePRD(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_PRD> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('PRD'); } catch (e) { /* skill unavailable */ }

        const evidenceBlock = await this.assembleDeliverableCorpus('Product Requirements Document', { tokenBudget: 30_000, minDistinctSources: 6 });
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-23 - P0.1: Chunked-first PRD generation. The 16-section Cagan/
        // SVPG PRD is split into 4 section families (Problem/Solution/Execution/
        // Risk) generated in parallel. Single-shot path historically truncated
        // around section 8-12 on dense PRDs. Chunker output is mapped to the
        // legacy StepResult_PRD shape before validation + Phase 2 feature
        // enrichment runs.
        try {
            const { chunkedGeneratePRD } = await import('./deliverableChunkers');
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating PRD in 4 parallel section families (Problem / Solution / Execution / Risk)...');
            const chunkedResult = await chunkedGeneratePRD({
                goal: this.goal,
                skillInstructions,
                evidenceBlock,
                contextBlock: ctxBlock + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
                personas: [],
                recommendations: [],
            });
            const result: StepResult_PRD = {
                methodology: chunkedResult.methodology,
                prd: chunkedResult.prd,
            } as any;
            if (!result.prd) result.prd = { title: 'Untitled', purposeAndObjectives: '', features: [], successMetrics: [], sections: [] } as any;
            if (!result.prd.features) result.prd.features = [];
            if (!result.prd.successMetrics) result.prd.successMetrics = [];
            if (!result.prd.sections) result.prd.sections = [];

            // Phase 2 features fill (existing scaffolding preserved)
            if (result.prd.features.length < 5) {
                onStream('Phase 2: Generating product features...');
                const featurePrompt = `STEP: GENERATE PRODUCT FEATURES for the PRD "${result.prd.title}".

Based on the research themes, persona pain points, and strategic recommendations, generate 8-15 concrete product features with MoSCoW prioritization.

CONTEXT:
PRD Title: ${result.prd.title}
Purpose: ${result.prd.purposeAndObjectives}
Success Metrics: ${result.prd.successMetrics.join('; ')}

FOR EACH FEATURE:
- name: Specific capability
- priority: Must-have / Should-have / Could-have / Won't-have
- description: 40-60 words covering: what it does, which persona it serves, which pain point it addresses, expected impact. Cite evidence.
- acceptanceCriteria: 2-3 testable conditions
- citations: 2-3 source names
- evidenceBasis: 1-2 sentences with specific data

DISTRIBUTION: At least 3 Must-have, 3 Should-have, 2 Could-have, 1 Won't-have.
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
                const featureSchema: Schema = {
                    type: Type.OBJECT,
                    properties: {
                        features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                            name: { type: Type.STRING }, priority: { type: Type.STRING },
                            description: { type: Type.STRING },
                            acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                            citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                            evidenceBasis: { type: Type.STRING }
                        }, required: ["name", "priority", "description", "citations", "evidenceBasis"] } }
                    },
                    required: ["features"]
                };
                try {
                    const featureResult = await this.executeStep<any>(featurePrompt, featureSchema, [], onStream);
                    result.prd.features = featureResult.features || [];
                    onStream(`Generated ${result.prd.features.length} features.`);
                } catch (e: any) {
                    onStream(`[PRD] feature generation failed: ${e?.message || e}`);
                }
            }
            result.prd.features.forEach(f => {
                if (!f.userStories) f.userStories = [];
                if (!f.name) f.name = 'Unnamed Feature';
            });

            // Validate
            const prdValidation = validateDeliverableOutput(result, 'prd');
            if (!prdValidation.valid && !feedback) {
                // 2026-05-26 - Wired the last from-scratch regen site to use
                // the reinforcement-inference wrapper. Anchors prior PRD into
                // the re-ask so the model preserves the items it got right.
                const sig = {
                    overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                    leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                    validationFailures: prdValidation.failures,
                };
                console.log(`[Validation] ${prdValidation.failures.length} issues on chunked PRD, reinforcing...`);
                onStream(`Quality gate: ${prdValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
                const reinforcedFeedback = shouldReinforce(sig)
                    ? buildReinforceFeedbackString({ priorAnswer: result, failures: prdValidation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'prd' })
                    : prdValidation.failures.join('. ');
                await appendUncertaintyLedger({
                    deliverableName: 'prd-chunked',
                    timestamp: new Date().toISOString(),
                    triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                    overallConfidence: sig.overallConfidence,
                    leastDefensibleClaims: sig.leastDefensibleClaims,
                    validationFailures: sig.validationFailures,
                    resolution: 'reinforced',
                });
                return this.generatePRD(reinforcedFeedback, onStream);
            }
            return result;
        } catch (chunkErr: any) {
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[PRD] chunked generation failed: ${msg}. Falling back to single-shot (KNOWN truncation risk).`);
            console.warn('[PRD] chunked path failed:', chunkErr);
            // Fall through to single-shot below.
        }

        // 2026-05-12 - R1 Verbalized Confidence on PRD features. PRD priorities
        // (Must/Should/Could/Won't) and acceptance criteria are exactly the
        // claims that benefit from explicit self-assessment - the model knows
        // which features are reaching beyond evidence.
        const prdVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'PRD',
            claimNoun: 'feature',
            claimNounPlural: 'features',
            maxHighFraction: 0.55,
        });
        const prompt = `${skillInstructions ? `=== AGENT SKILL: PRD COMPILER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${prdVcDirective}\nSECTION COMPLETENESS REQUIREMENT (PRD-03): Generate ALL 16 sections per the Cagan/SVPG framework:
1. Problem statement (data-backed, THE most important section)
2. User stories ("As a [persona], I want [goal] so that [benefit]")
3. Acceptance criteria (Given/When/Then format)
4. Success metrics (SMART with baselines, targets, AND guardrail metrics)
5. User personas (reference by name from persona generation step)
6. Functional requirements (outcomes not implementations)
7. Non-functional requirements (performance, scalability, security, accessibility)
8. Technical constraints and dependencies
9. Wireframes/mockups (describe conceptually)
10. Data requirements and privacy considerations
11. Release/launch criteria - phased rollout plan
12. Risk assessment with mitigations
13. Assumptions and open questions (TBD placeholders)
14. Out of scope / non-goals (prevents scope creep)
15. Timeline and milestones
16. Stakeholder sign-off matrix

For sections without sufficient data, write the section narrowly around what IS evidenced - do NOT pad with generic content, and do NOT write "EVIDENCE GAP", "Evidence Gap", "TBD", or any meta-annotation visible to readers. If a section truly has no evidenced content, omit it. The output is a finished deliverable, not an annotated draft.
Use MoSCoW priority on ALL features: Must-have | Should-have | Could-have | Won't-have

STEP: PRODUCT REQUIREMENTS DOCUMENT. You are a senior product manager translating research insights into actionable requirements.

METHODOLOGY: Map EVERY persona pain point and strategic recommendation to a concrete product feature. The PRD is the bridge between "what we learned" and "what we build."

TITLE: Create a specific, descriptive product/initiative name that reflects the research domain (NOT a generic version number or hash).

PURPOSE & OBJECTIVES: 3-5 sentences explaining:
- WHAT problem this product solves (cite specific themes from the research)
- WHO benefits (reference specific personas)
- HOW success will be measured (quantifiable metrics)

SUCCESS METRICS: 3-5 measurable KPIs tied to research findings (e.g., "Reduce prospect identification time by 40% - addresses [CHUNK_XXX] finding")

FEATURES (MoSCoW Prioritization):
- Generate features for EVERY major pain point identified across all personas
- Must-have: Features that directly address critical/high-severity problems from the research
- Should-have: Features addressing medium-severity issues
- Could-have: Enhancement opportunities identified in the data
- Won't-have (this release): Features explicitly deferred with rationale

FOR EACH FEATURE:
- name: Specific capability (NOT "Analytics Dashboard" - say "Real-Time Donor Engagement Scoring Dashboard")
- priority: Must-have / Should-have / Could-have / Won't-have
- description: 40-60 words covering: what it does, which persona it serves, which pain point it addresses, expected impact. Must cite [CHUNK_XXX].
- acceptanceCriteria: 2-3 testable conditions for "done"
- citations: Array of 2-3 source names that evidence the need for this feature (e.g., "Industry Trade Press", "Reddit: r/cscareerquestions", "Persona: <persona name> pain point #2")
- evidenceBasis: 1-2 sentences with specific data proving this feature is needed. Quote the persona pain point or research finding.

ANTI-PATTERNS:
- Generic product names with version hashes
- Features not traceable to research evidence
- Missing acceptance criteria
- Features without citations or evidence basis

ANTI-FABRICATION + ANTI-ANNOTATION (composer rule 8): NEVER invent percentages, dollar amounts, baselines, or competitor metrics in success metrics. If the catalog has no baseline for a target KPI, write the metric directionally without the number (e.g., "Reduce manual triage time"). Made-up "Reduce X by 40%" is grounds for rejection. Never write "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", or any meta-annotation in any field - the output is a finished deliverable, not an annotated draft.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                prd: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, purposeAndObjectives: { type: Type.STRING }, successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } }, sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sectionNumber: { type: Type.INTEGER }, title: { type: Type.STRING }, content: { type: Type.STRING }, evidenceGap: { type: Type.STRING } }, required: ["sectionNumber", "title", "content"] } }, features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, priority: { type: Type.STRING }, description: { type: Type.STRING }, acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING }, confidence: { type: Type.STRING }, confidenceRationale: { type: Type.STRING } }, required: ["name", "priority", "description", "citations", "evidenceBasis"] } } }, required: ["title", "purposeAndObjectives", "successMetrics", "sections", "features"] },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "prd"]
        };
        // PHASE 1: Generate PRD framework (title, purpose, metrics, sections)
        onStream('Phase 1: Generating PRD framework and sections...');
        const result = await this.executeStep<StepResult_PRD>(prompt, schema, [], onStream, /* groundedViaManifest */ true);
        // 2026-05-12 - R1 calibration inspection on PRD features.
        const prdAssessment = normalizeSelfAssessment((result as any).selfAssessment);
        if (prdAssessment) (result as any).selfAssessment = prdAssessment; else delete (result as any).selfAssessment;
        inspectCalibration('prd', (result as any)?.prd?.features as any[] || [], prdAssessment, 0.55);
        if (!result.prd) result.prd = { title: "Untitled", purposeAndObjectives: "", features: [], successMetrics: [], sections: [] } as any;
        if (!result.prd.features) result.prd.features = [];
        if (!result.prd.successMetrics) result.prd.successMetrics = [];
        if (!result.prd.sections) result.prd.sections = [];

        // PHASE 2: If features are empty OR undercounted (token exhaustion), generate them in a dedicated call
        if (result.prd.features.length < 5) {
            onStream('Phase 2: Generating product features...');
            const featurePrompt = `STEP: GENERATE PRODUCT FEATURES for the PRD "${result.prd.title}".

Based on the research themes, persona pain points, and strategic recommendations from the previous steps, generate 8-15 concrete product features with MoSCoW prioritization.

CONTEXT:
PRD Title: ${result.prd.title}
Purpose: ${result.prd.purposeAndObjectives}
Success Metrics: ${result.prd.successMetrics.join('; ')}

FOR EACH FEATURE:
- name: Specific capability (NOT "Analytics Dashboard" - say "Real-Time Donor Engagement Scoring Dashboard")
- priority: Must-have / Should-have / Could-have / Won't-have
- description: 40-60 words covering: what it does, which persona it serves, which pain point it addresses, expected impact. Cite evidence.
- acceptanceCriteria: 2-3 testable conditions (Given/When/Then)
- citations: 2-3 source names that evidence the need
- evidenceBasis: 1-2 sentences with specific data proving this feature is needed

DISTRIBUTION: At least 3 Must-have, 3 Should-have, 2 Could-have, 1 Won't-have.
Every feature MUST trace to a persona pain point or strategic recommendation.
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

            const featureSchema: Schema = {
                type: Type.OBJECT,
                properties: {
                    features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        name: { type: Type.STRING }, priority: { type: Type.STRING },
                        description: { type: Type.STRING },
                        acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                        citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        evidenceBasis: { type: Type.STRING }
                    }, required: ["name", "priority", "description", "citations", "evidenceBasis"] } }
                },
                required: ["features"]
            };

            try {
                const featureResult = await this.executeStep<any>(featurePrompt, featureSchema, [], onStream);
                result.prd.features = featureResult.features || [];
                onStream(`Generated ${result.prd.features.length} features.`);
            } catch (e) {
                console.warn('[PRD] Feature generation failed:', e);
            }
        }

        // Ensure each feature has sub-arrays
        result.prd.features.forEach(f => {
            if (!f.userStories) f.userStories = [];
            if (!f.name) f.name = 'Unnamed Feature';
        });

        // Validate and auto-retry if evidence is thin
        const prdValidation = validateDeliverableOutput(result, 'prd');
        if (!prdValidation.valid && !feedback) {
            // 2026-05-23 - P0.2 - anchored re-ask for PRD on validation failure.
            const sig = {
                overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                validationFailures: prdValidation.failures,
            };
            onStream(`Quality gate: ${prdValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: result, failures: prdValidation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'prd' })
                : prdValidation.failures.join('. ');
            await appendUncertaintyLedger({
                deliverableName: 'prd', timestamp: new Date().toISOString(),
                triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                overallConfidence: sig.overallConfidence,
                leastDefensibleClaims: sig.leastDefensibleClaims,
                validationFailures: sig.validationFailures,
                resolution: 'reinforced',
            });
            return this.generatePRD(reinforcedFeedback, onStream);
        }

        return result;
    }

    async generateRoadmap(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Roadmap> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('ROADMAP'); } catch (e) { /* skill unavailable */ }

        const evidenceBlock = await this.assembleDeliverableCorpus('Roadmap', { tokenBudget: 30_000, minDistinctSources: 6 });
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-23 - P0.1: Chunked-first generation per the chunking plan.
        // Roadmap chunks across 3 horizons (NOW / NEXT / LATER) in parallel,
        // so each call emits a tight ~5-8K-token output instead of the prior
        // single-shot ~15-25K-token call that frequently truncated at horizon
        // 2 of 3. The chunker prompts include the same evidence + context
        // blocks, so output quality is preserved while completeness becomes
        // structurally guaranteed.
        try {
            const { chunkedGenerateRoadmap } = await import('./deliverableChunkers');
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES (use as context, do not regenerate) ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating roadmap horizons in parallel (NOW / NEXT / LATER)...');
            const chunkedResult = await chunkedGenerateRoadmap({
                goal: this.goal,
                skillInstructions,
                evidenceBlock,
                contextBlock: ctxBlock + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
                personas: [],
                recommendations: [],
            });
            const result: StepResult_Roadmap = {
                methodology: chunkedResult.methodology || 'NOW/NEXT/LATER horizon framework with problem framing, chunked per-horizon for parallel generation and completeness.',
                roadmap: chunkedResult.roadmap || { vision: '', items: [] },
            };
            if (!result.roadmap.items) result.roadmap.items = [];

            // Phase 2: Enrich thin items (preserves existing scaffolding)
            const thinItems = result.roadmap.items.filter(i => !i.citations?.length || !i.evidenceBasis);
            if (thinItems.length > 0) {
                onStream(`Enriching ${thinItems.length} roadmap items with evidence...`);
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                for (const item of thinItems) {
                    try {
                        const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                            model: 'gemini-3.5-flash',
                            contents: { parts: [{ text: `Enrich this roadmap initiative with evidence.\n\nInitiative: ${item.initiative}\nHorizon: ${item.horizon}\nDescription: ${item.description}\n\nProvide:\n1. citations: 2-3 source names\n2. evidenceBasis: 1-2 sentences with specific data\n3. successMetric: A specific measurable target with baseline\n4. dependencies: What must happen first\n\nOutput JSON.` }] },
                            config: { responseMimeType: 'application/json', temperature: 0.2 }
                        }), 2, 2000, `Enrich roadmap: ${item.initiative.substring(0, 30)}`);
                        const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                        if (enriched.citations?.length) item.citations = enriched.citations;
                        if (enriched.evidenceBasis) item.evidenceBasis = enriched.evidenceBasis;
                        if (enriched.successMetric && !item.successMetric) item.successMetric = enriched.successMetric;
                        if (enriched.dependencies && !item.dependencies) item.dependencies = enriched.dependencies;
                    } catch (e) {
                        // P0.4 - surface enrichment failures instead of silent absorption
                        onStream(`[Roadmap] enrichment failed for "${item.initiative.slice(0, 40)}": ${(e as any)?.message || e}`);
                    }
                }
            }

            // Validate the chunked result before returning
            const roadmapValidation = validateDeliverableOutput(result, 'roadmap');
            if (!roadmapValidation.valid && !feedback) {
                // P0.2 - anchored re-ask for chunked roadmap on validation failure.
                const sig = {
                    overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                    leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                    validationFailures: roadmapValidation.failures,
                };
                onStream(`Quality gate: ${roadmapValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
                const reinforcedFeedback = shouldReinforce(sig)
                    ? buildReinforceFeedbackString({ priorAnswer: result, failures: roadmapValidation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'roadmap' })
                    : roadmapValidation.failures.join('. ');
                await appendUncertaintyLedger({
                    deliverableName: 'roadmap', timestamp: new Date().toISOString(),
                    triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                    overallConfidence: sig.overallConfidence,
                    leastDefensibleClaims: sig.leastDefensibleClaims,
                    validationFailures: sig.validationFailures,
                    resolution: 'reinforced',
                });
                return this.generateRoadmap(reinforcedFeedback, onStream);
            }
            return result;
        } catch (chunkErr: any) {
            // P0.4 - surface chunker failure, do NOT silently fall back to single-shot.
            // The error propagates so the caller (App.tsx) shows a real failure card
            // instead of shipping a partial roadmap as if it succeeded.
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[Roadmap] chunked generation failed: ${msg}. Falling back to single-shot path (KNOWN truncation risk).`);
            console.warn('[Roadmap] chunked path failed, using single-shot fallback (this surfaces to user):', chunkErr);
            // Fall through to single-shot path below. The fallback ITSELF is the
            // failure mode this plan is meant to eliminate - we surface it
            // visibly via onStream rather than hiding it.
        }

        // 2026-05-12 - R1 Verbalized Confidence on roadmap initiatives. The
        // existing `confidenceLevel` per item (HIGH/MEDIUM/EXPLORATORY) is a
        // horizon proxy retained for legacy consumers. The new VC envelope
        // adds the formal RI-trigger signal so the model can flag which
        // success metrics or dependencies are reaching beyond evidence.
        const roadmapVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'roadmap',
            claimNoun: 'initiative',
            claimNounPlural: 'initiatives',
            maxHighFraction: 0.45,
        });
        const prompt = `${skillInstructions ? `=== AGENT SKILL: ROADMAP BUILDER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${roadmapVcDirective}\nSTEP: STRATEGIC ROADMAP. You are a strategy consultant creating an evidence-based implementation roadmap.

MANDATORY ROADMAP FIELDS (R-01, R-03):
Every roadmap initiative MUST include ALL of these fields:
- "successMetric": A specific, measurable target. Example: "Reduce donor churn by 15% within 6 months (baseline: 22%)"
- "strategicTheme": Which strategic pillar this serves (e.g., "Data Unification", "AI Personalization", "Trust & Transparency")
- "owner": Who is responsible (role, not person name)
- "dependencies": What must happen first (reference other initiative names)
- "confidenceLevel": NOW items = "HIGH", NEXT items = "MEDIUM", LATER items = "EXPLORATORY"

STRATEGIC THEME GROUPING: Identify 3-5 strategic themes/pillars FIRST, then tag every initiative to a theme.
Each theme should have items across NOW/NEXT/LATER horizons.

PROBLEM FRAMING: Every initiative MUST be framed as a PROBLEM, not a feature.
BAD: "Build unified constituent data hub"
GOOD: "Advancement practitioners waste 30% of outreach time cross-referencing fragmented systems"

VISION: 2-3 sentences describing the desired future state, grounded in research themes. What does success look like in 12-18 months?

HORIZON FRAMEWORK:
- NOW (0-3 months): Quick wins and critical fixes identified in the research. These address the most urgent pain points.
- NEXT (3-9 months): Strategic initiatives that require planning and resources. Build on NOW foundations.
- LATER (9-18 months): Transformative changes that require organizational readiness.

FOR EACH INITIATIVE:
- initiative: Specific, action-oriented name framed as a PROBLEM, not a feature
- horizon: "Now" | "Next" | "Later"
- owner: The role/team responsible (e.g., "VP of Advancement", "IT Department", "Student Services Director")
- description: 30-50 words explaining WHAT, WHY (cite evidence [CHUNK_XXX]), and expected IMPACT
- dependencies: What must happen first (reference other initiatives by name)
- successMetric: A specific, measurable target with baseline and timeframe
- strategicTheme: Which of the 3-5 strategic pillars this initiative serves
- confidenceLevel: "HIGH" for NOW, "MEDIUM" for NEXT, "EXPLORATORY" for LATER

REQUIREMENTS:
- Generate initiatives for EVERY strategic recommendation from previous steps
- Each initiative must trace to a specific theme or recommendation
- NOW horizon must include at least 2 quick wins from the research
- Balance across personas - don't over-index on one stakeholder group
- Include at least 1 initiative per persona archetype identified
- Every theme must have at least one initiative in each horizon

ANTI-FABRICATION + ANTI-ANNOTATION (composer rule 8): NEVER invent baseline metrics or success-metric percentages. If the evidence catalog has no baseline for an initiative's target metric, write the metric directionally without numbers (e.g., "Reduce time-to-onboard"). Made-up "15% reduction in churn (baseline 22%)" is grounds for rejection. Never write "EVIDENCE GAP", "Evidence Gap", "TBD", "[needs baseline]", "baseline TBD", or any meta-annotation in any field - the output is a finished deliverable read by executives, not an annotated draft.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                roadmap: { type: Type.OBJECT, properties: { vision: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { initiative: { type: Type.STRING }, horizon: { type: Type.STRING }, owner: { type: Type.STRING }, description: { type: Type.STRING }, dependencies: { type: Type.STRING }, successMetric: { type: Type.STRING }, strategicTheme: { type: Type.STRING }, confidenceLevel: { type: Type.STRING }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING }, confidence: { type: Type.STRING }, confidenceRationale: { type: Type.STRING } }, required: ["initiative", "horizon", "owner", "description", "successMetric", "strategicTheme", "confidenceLevel", "citations", "evidenceBasis"] } } }, required: ["vision", "items"] },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "roadmap"]
        };
        const result = await this.executeStep<StepResult_Roadmap>(prompt, schema, [], onStream, /* groundedViaManifest */ true);
        if (!result.roadmap) result.roadmap = { vision: "", items: [] } as any;
        if (!result.roadmap.items) result.roadmap.items = [];
        // 2026-05-12 - R1 calibration inspection on roadmap initiatives.
        const roadmapAssessment = normalizeSelfAssessment((result as any).selfAssessment);
        if (roadmapAssessment) (result as any).selfAssessment = roadmapAssessment; else delete (result as any).selfAssessment;
        inspectCalibration('roadmap', result.roadmap.items as any[], roadmapAssessment, 0.45);

        // Phase 2: Enrich roadmap items with thin evidence
        const thinItems = result.roadmap.items.filter(i => !i.citations?.length || !i.evidenceBasis);
        if (thinItems.length > 0) {
            onStream(`Enriching ${thinItems.length} roadmap items with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const item of thinItems) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: `Enrich this roadmap initiative with evidence.\n\nInitiative: ${item.initiative}\nHorizon: ${item.horizon}\nDescription: ${item.description}\n\nProvide:\n1. citations: 2-3 source names evidencing this initiative\n2. evidenceBasis: 1-2 sentences with specific data proving the need\n3. successMetric: A specific measurable target with baseline\n4. dependencies: What must happen first\n\nOutput JSON.` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich roadmap: ${item.initiative.substring(0, 30)}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length) item.citations = enriched.citations;
                    if (enriched.evidenceBasis) item.evidenceBasis = enriched.evidenceBasis;
                    if (enriched.successMetric && !item.successMetric) item.successMetric = enriched.successMetric;
                    if (enriched.dependencies && !item.dependencies) item.dependencies = enriched.dependencies;
                } catch (e) { /* non-blocking */ }
            }
        }

        // Validate
        const roadmapValidation = validateDeliverableOutput(result, 'roadmap');
        if (!roadmapValidation.valid && !feedback) {
            const sig = {
                overallConfidence: (result as any).selfAssessment?.overallConfidence || 'MEDIUM',
                leastDefensibleClaims: (result as any).selfAssessment?.leastDefensibleClaims || [],
                validationFailures: roadmapValidation.failures,
            };
            onStream(`Quality gate: ${roadmapValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: result, failures: roadmapValidation.failures, leastDefensibleClaims: sig.leastDefensibleClaims, deliverableName: 'roadmap' })
                : roadmapValidation.failures.join('. ');
            await appendUncertaintyLedger({
                deliverableName: 'roadmap', timestamp: new Date().toISOString(),
                triggerScore: shouldReinforce(sig) ? 0.5 : 0.2,
                overallConfidence: sig.overallConfidence,
                leastDefensibleClaims: sig.leastDefensibleClaims,
                validationFailures: sig.validationFailures,
                resolution: 'reinforced',
            });
            return this.generateRoadmap(reinforcedFeedback, onStream);
        }

        // 2026-05-25 - Expert panel: roadmap-builder + quantification-architect
        // (enforces the learned constraint "every horizon item must have a
        // specific quantified success metric with baseline and timeframe") +
        // pre-mortem (risk lens on the sequencing).
        try {
            const { runExpertPanel } = await import('./artifactExpertPanel');
            const panelResult = await runExpertPanel<StepResult_Roadmap>({
                deliverable: result,
                kind: 'roadmap',
            });
            if (panelResult?.result) {
                onStream(`Roadmap expert panel: ${panelResult.panel_summary.experts_fired.length} critics fired, ${panelResult.panel_summary.critics_with_edits.length} produced edits ($${panelResult.total_cost_usd.toFixed(3)})`);
                return panelResult.result;
            }
        } catch (panelErr: any) {
            console.warn('[Roadmap] expert panel skipped:', panelErr?.message || panelErr);
        }

        return result;
    }

    async generateTechArchitecture(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_TechArch> {
        // 2026-05-23 - P0.1: Chunked-first tech architecture. C4 context pass +
        // per-node container detail in parallel. Single-shot path truncated on
        // architectures with 6+ nodes.
        try {
            let _skill = '';
            try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); _skill = await loadSkillPrompt('TECH_ARCHITECTURE'); } catch { /* skill unavailable */ }
            const _ev = await this.assembleDeliverableCorpus('Technical Architecture', { tokenBudget: 30_000, minDistinctSources: 6 });
            const _ctx = renderDeliverableContextBlock(await loadDeliverableContext(this.goal));
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating tech architecture: C4 context + per-node container detail in parallel...');
            const { chunkedGenerateTechArchitecture } = await import('./deliverableChunkers');
            const chunkedResult = await chunkedGenerateTechArchitecture({
                goal: this.goal,
                skillInstructions: _skill,
                evidenceBlock: _ev,
                contextBlock: _ctx + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
            });
            const result: StepResult_TechArch = {
                methodology: chunkedResult.methodology,
                architecture: chunkedResult.architecture,
            } as any;
            return result;
        } catch (chunkErr: any) {
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[Tech Architecture] chunked generation failed: ${msg}. Falling back to single-shot (KNOWN truncation risk).`);
            console.warn('[Tech Architecture] chunked path failed:', chunkErr);
            // Fall through to single-shot
        }
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('TECH_ARCH'); } catch (e) { /* skill unavailable */ }

        const evidenceBlock = await this.assembleDeliverableCorpus('Technology Architecture', { tokenBudget: 30_000, minDistinctSources: 6 });
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // TWO-PHASE: System map (nodes+flows) first, then architecture sections.
        // Single-call with 20 sections + nodes + flows always truncates.

        onStream("Phase A: Mapping technology components...");
        const mapPrompt = `${skillInstructions ? `=== AGENT SKILL: TECH ARCH GENERATOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: TECH ARCHITECTURE PHASE A - SYSTEM MAP.
Extract ALL technology components, systems, platforms, and integrations from the research.

OVERVIEW: 3-5 sentences describing the technology landscape.

NODES (minimum 6): Every system mentioned in the corpus. CITE where you found each system.
- id: unique identifier (e.g., "crm_1", "portal_web")
- label: Exact system name from research (e.g., "Salesforce CRM", "Student Portal")
- type: "User" | "Application" | "Database" | "Integration" | "External" | "AI/ML"
- description: What it does and current state. Must cite [CHUNK_XXX] where this system was mentioned.
- citations: Array of source names where this system was found (e.g., ["Client SOW", "Industry Trade Press"])

FLOWS (minimum 5): Connections between nodes.
- fromId/toId: Node IDs
- action: What data/process moves between them
- status: "active" | "planned" | "broken"

ANTI-FABRICATION (composer rule 8): NEVER invent system names, vendors, or integration counts. If the corpus does not name a vendor for a system category, label the node "Unspecified [Category]" - do NOT make up "Salesforce" or "Workday" if the catalog does not mention them.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const mapSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                overview: { type: Type.STRING },
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: {type:Type.STRING}, label: {type:Type.STRING}, type: {type:Type.STRING}, description: {type:Type.STRING}, citations: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["id", "label", "type", "citations"] } },
                flows: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fromId: {type:Type.STRING}, toId: {type:Type.STRING}, action: {type:Type.STRING}, status: {type:Type.STRING} }, required: ["fromId", "toId", "action"] } },
            },
            required: ["methodology", "overview", "nodes", "flows"]
        };
        const map = await this.executeStep<any>(mapPrompt, mapSchema, [], onStream, /* groundedViaManifest */ true);

        onStream(`Found ${(map.nodes || []).length} nodes, ${(map.flows || []).length} flows. Phase B: Writing architecture sections...`);
        const sectionsPrompt = `STEP: TECH ARCHITECTURE PHASE B - ARCHITECTURE DOCUMENT SECTIONS.
Based on the system map (${(map.nodes || []).map((n: any) => n.label).join(', ')}), write 10 key architecture sections.
For each: sectionNumber, title, content (2-4 sentences with evidence). Leave evidenceGap as an empty string - never write "EVIDENCE GAP", "Evidence Gap", "TBD", or any meta-annotation in user-facing fields; the output is a finished deliverable.
Cover: executive summary, current state, future state, data architecture, integration architecture, security, scalability, tech stack rationale, gap analysis, risks.
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const sectionsSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    sectionNumber: { type: Type.INTEGER }, title: { type: Type.STRING },
                    content: { type: Type.STRING }, evidenceGap: { type: Type.STRING }
                }, required: ["sectionNumber", "title", "content"] } }
            },
            required: ["sections"]
        };
        const secs = await this.executeStep<any>(sectionsPrompt, sectionsSchema, [], onStream, /* groundedViaManifest */ true);

        const result: StepResult_TechArch = {
            methodology: map.methodology || '',
            architecture: {
                overview: map.overview || '',
                sections: secs.sections || [],
                nodes: map.nodes || [],
                flows: map.flows || [],
            } as any
        };

        // NXT Design System: No decorative AI diagrams. Architecture is rendered
        // as structured node/edge visualization by the frontend component.
        return result;
    }

    /**
     * Serialize all available deliverables into a compact text digest for the deck prompt.
     * READ-ONLY: does not mutate any input data. Per-section cap of 4KB, total ~20-30KB.
     */
    private buildDeckDigest(ctx: DeckInputContext): string {
        const sections: string[] = [];
        const cap = (s: string, max = 4000) => s.length > max ? s.substring(0, max) + '...' : s;

        if (ctx.themes?.length) {
            const lines = ctx.themes.map((t, i) =>
                `${i + 1}. ${t.name}: ${t.description}${t.quote ? ` -- "${t.quote.substring(0, 80)}"` : ''} [${t.citations?.length || 0} citations, ${t.isCrossDocument ? 'cross-source' : 'single-source'}]`
            );
            sections.push(`=== THEMES (${ctx.themes.length}) ===\n${cap(lines.join('\n'))}\n=== END THEMES ===`);
        }

        if (ctx.personas?.length) {
            const lines = ctx.personas.map(p => {
                const topPain = p.painPoints?.[0]?.label || '';
                const topGoal = p.goals?.functionalGoal || '';
                return `- ${p.name} (${p.role}): JTBD: "${p.jtbd || 'N/A'}". Pain: "${topPain}". Goal: "${topGoal}". Quote: "${(p.quote || '').substring(0, 60)}". Image: ${p.imageUrl ? 'AVAILABLE' : 'none'}`;
            });
            sections.push(`=== PERSONAS (${ctx.personas.length}) ===\n${cap(lines.join('\n'))}\n=== END PERSONAS ===`);
        }

        if (ctx.recommendations?.length) {
            const lines = ctx.recommendations.map(r =>
                `- [${r.impactLevel}] ${r.title}: ${r.description.substring(0, 100)}${r.actionItems?.length ? ` (${r.actionItems.length} actions)` : ''}`
            );
            sections.push(`=== RECOMMENDATIONS (${ctx.recommendations.length}) ===\n${cap(lines.join('\n'))}\n=== END RECOMMENDATIONS ===`);
        }

        if (ctx.journeyStages?.length) {
            const lines = ctx.journeyStages.map(s =>
                `- ${s.phase}: Action="${s.customerAction}". Pain="${s.painPoint}". Emotion=${s.emotion}. Touchpoint=${s.touchpoint}`
            );
            sections.push(`=== SERVICE BLUEPRINT (${ctx.journeyStages.length} stages) ===\n${cap(lines.join('\n'))}\n=== END BLUEPRINT ===`);
        }

        if (ctx.prd) {
            const topFeatures = (ctx.prd.features || []).slice(0, 5).map(f =>
                `  - [${f.priority}] ${f.name}: ${f.description.substring(0, 80)}`
            ).join('\n');
            const text = `Title: ${ctx.prd.title}\nObjective: ${(ctx.prd.purposeAndObjectives || '').substring(0, 200)}\nTop Features:\n${topFeatures}\nSuccess Metrics: ${(ctx.prd.successMetrics || []).slice(0, 3).join('; ')}`;
            sections.push(`=== PRD ===\n${cap(text)}\n=== END PRD ===`);
        }

        if (ctx.roadmap) {
            const byHorizon = (h: string) => (ctx.roadmap!.items || []).filter(i => i.horizon === h);
            const fmt = (items: any[]) => items.slice(0, 4).map(i => `  - ${i.initiative}: ${(i.description || '').substring(0, 60)} [${i.owner || '?'}]`).join('\n');
            const text = `Vision: ${ctx.roadmap.vision}\nNOW (0-3m):\n${fmt(byHorizon('Now'))}\nNEXT (3-9m):\n${fmt(byHorizon('Next'))}\nLATER (9-18m):\n${fmt(byHorizon('Later'))}`;
            sections.push(`=== ROADMAP ===\n${cap(text)}\n=== END ROADMAP ===`);
        }

        if (ctx.techArchitecture) {
            const nodes = (ctx.techArchitecture.nodes || []).slice(0, 10).map(n => `  - ${n.label} (${n.type}): ${(n.description || '').substring(0, 50)}`).join('\n');
            const flows = (ctx.techArchitecture.flows || []).slice(0, 5).map(f => `  - ${f.fromId} -> ${f.toId}: ${f.action || ''}`).join('\n');
            const text = `Overview: ${(ctx.techArchitecture.overview || '').substring(0, 200)}\nNodes:\n${nodes}\nFlows:\n${flows}`;
            sections.push(`=== TECH ARCHITECTURE ===\n${cap(text)}\n=== END TECH ARCHITECTURE ===`);
        }

        if (ctx.gapAnalysis) {
            const gaps = (ctx.gapAnalysis.gaps || []).slice(0, 5).map(g =>
                `  - [${g.severity}] ${g.capability}: Current ${g.currentMaturity}/5 -> Target ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${(g.impact || '').substring(0, 60)}`
            ).join('\n');
            const quickWins = (ctx.gapAnalysis.quickWins || []).slice(0, 3).map(q => `  - ${q.action}`).join('\n');
            sections.push(`=== GAP ANALYSIS ===\nScope: ${(ctx.gapAnalysis.assessmentScope || '').substring(0, 150)}\nTop Gaps:\n${gaps}\nQuick Wins:\n${quickWins}\n=== END GAP ANALYSIS ===`);
        }

        if (ctx.techAudit) {
            const systems = (ctx.techAudit.systemsInventory || []).slice(0, 8).map(s =>
                `  - ${s.name} (${s.vendor}, ${s.status}): ${s.category}`
            ).join('\n');
            const consolidation = (ctx.techAudit.consolidationOpportunities || []).slice(0, 3).map(c =>
                `  - ${c.title}: ${(c.description || '').substring(0, 60)}`
            ).join('\n');
            sections.push(`=== TECH AUDIT ===\nSystems:\n${systems}\nConsolidation Opportunities:\n${consolidation}\n=== END TECH AUDIT ===`);
        }

        if (ctx.competitiveAnalysis) {
            const peers = (ctx.competitiveAnalysis.peers || []).slice(0, 4).map(p =>
                `  - ${p.name}: ${p.position}. Strengths: ${(p.strengths || []).slice(0, 2).join(', ')}. Weaknesses: ${(p.weaknesses || []).slice(0, 2).join(', ')}`
            ).join('\n');
            const topGaps = (ctx.competitiveAnalysis.gapSummary || []).slice(0, 3).map(g =>
                `  - ${g.dimension}: Our ${g.ourScore} vs Best ${g.bestInClass} (gap ${g.gap})`
            ).join('\n');
            sections.push(`=== COMPETITIVE LANDSCAPE ===\nContext: ${(ctx.competitiveAnalysis.industryContext || '').substring(0, 150)}\nPeers:\n${peers}\nKey Gaps:\n${topGaps}\n=== END COMPETITIVE LANDSCAPE ===`);
        }

        if (sections.length === 0) return '';

        return `\n\n=== AVAILABLE DELIVERABLE DATA (use ALL of this to build the deck) ===\nThe following deliverables have been generated by the research pipeline. Reformat this content into slide-appropriate layouts. Do NOT modify the original deliverables - the deck is a PRESENTATION of them.\n\n${sections.join('\n\n')}\n\n=== END DELIVERABLE DATA ===\n`;
    }

    async generateDeckStructure(feedback: string | undefined, context: DeckInputContext, onStream: (t: string) => void): Promise<StepResult_Structure> {
        // 2026-06-06 - MANIFEST -> WIKI resolution before digest. Prefer wiki
        // bodies (single source of truth) over the in-memory context the
        // caller threaded through. Falls back to in-memory state when the
        // wiki copy is missing (e.g. deliverable generated in this session
        // and not yet persisted). The resolver caches per-engagement so the
        // strategic-report-writer + buildDeckDigest don't double-fetch.
        const _deckSlug = currentEngagementSlug();
        if (_deckSlug) {
            const _deckResolved = await resolveDeliverableBodies(_deckSlug, [
                'themes', 'personas', 'journey', 'recs', 'prd', 'roadmap',
                'gap', 'techAudit', 'competitive', 'techArch',
            ]);
            const _bk = _deckResolved.bodies as any;
            const _take = <T,>(wKey: string, subKey: string, inMem: T): T => {
                const w = _bk[wKey];
                if (!w) return inMem;
                const sub = w[subKey];
                if (Array.isArray(sub) && sub.length) return sub as any;
                if (w && typeof w === 'object' && !Array.isArray(w) && subKey === '') return w as any;
                if (sub && typeof sub === 'object') return sub as any;
                return inMem;
            };
            context = {
                ...context,
                themes: _take('themes', 'themes', context.themes || []),
                personas: _take('personas', 'personas', context.personas || []),
                journeyStages: _take('journey', 'stages', context.journeyStages || []),
                recommendations: _take('recs', 'recommendations', context.recommendations || []),
                prd: _bk.prd || context.prd,
                roadmap: _bk.roadmap || context.roadmap,
                techArchitecture: _bk.techArch || context.techArchitecture,
                gapAnalysis: _bk.gap || context.gapAnalysis,
                techAudit: _bk.techAudit || context.techAudit,
                competitiveAnalysis: _bk.competitive || context.competitiveAnalysis,
            };
            console.info(`[generateDeckStructure] wiki-resolved ${_deckResolved.readCount} deliverable(s) for slug=${_deckSlug} in ${_deckResolved.elapsedMs}ms; missing: ${_deckResolved.missingKinds.join(',') || 'none'}`);
        }
        // Use strategic report as primary source when available (report-first architecture)
        // Falls back to buildDeckDigest for backward compatibility when no report exists
        let digest: string;
        if (context.strategicReport) {
            const report = context.strategicReport;
            const sections = (report.sections || []).map(s =>
                `Section ${s.sectionNumber}: ${s.title} [${s.sourceDeliverable}]\n${s.content}\n${s.keyMetrics?.map(m => `  Metric: ${m.label} = ${m.value}`).join('\n') || ''}${s.keyQuote ? `\n  Quote: "${s.keyQuote.text}" -- ${s.keyQuote.attribution}` : ''}\n  Sources: ${(s.citations || []).join(', ')}`
            ).join('\n\n');
            digest = `\n\n=== STRATEGIC REPORT (synthesized from all deliverables - use this as primary source) ===
Title: ${report.title}
Executive Summary: ${report.executiveSummary}
Diagnosis: ${report.diagnosis}
Guiding Policy: ${report.guidingPolicy}
Strategic Pillars: ${(report.strategicPillars || []).join('; ')}

REPORT SECTIONS:
${sections}
=== END STRATEGIC REPORT ===\n`;
        } else {
            digest = this.buildDeckDigest(context);
        }
        const prompt = `STEP: DECK STRUCTURE. You are a McKinsey-trained presentation strategist building a comprehensive executive research deck.

MINTO'S PYRAMID PRINCIPLE (non-negotiable):
- Think from the bottom up, present from the top down
- State the CONCLUSION first, then support with evidence
- Every slide title MUST be a COMPLETE SENTENCE stating a conclusion - NOT a topic label
  BAD: "Market Overview", "Current Challenges", "Recommendations"
  GOOD: "Repeat-customer revenue declined 12% while overall revenue grew 3%, creating a retention crisis"
- THE PARTNER TEST: A senior partner reading ONLY the slide titles in order must understand the complete argument.
- All arguments must be MECE (Mutually Exclusive, Collectively Exhaustive)

RUMELT'S KERNEL (the deck must contain all three):
1. DIAGNOSIS: ONE specific challenge with evidence.
2. GUIDING POLICY: ONE strategic choice that excludes alternatives.
3. COHERENT ACTIONS: 5-7 actions that support EACH OTHER.

NARRATIVE FRAMEWORK (Situation-Complication-Resolution):
Let the RICHNESS OF AVAILABLE DELIVERABLES determine deck size. Do NOT cap at 10-12 slides.

1. TITLE (1 slide, TITLE_SLIDE): Research title and objective.
2. EXECUTIVE SUMMARY (1-2 slides, CONTENT_DATA_PANEL or BENTO_GRID): Complete argument in SCR format. The most important slide - it must convince on its own.
3. SITUATION - What's happening:
   - Theme landscape slides (BENTO_GRID): Show research themes with key stats
   - Competitive positioning slides (CONTENT_DATA_PANEL or FULL_WIDTH_VIZ): Where we stand vs peers
   - Service blueprint pain points (PROBLEM_SOLUTION): Journey friction points
4. COMPLICATION - Why the status quo is unacceptable:
   - Persona tension slides (CONTENT_DATA_PANEL with persona image): Show real people affected. MUST include persona image.
   - Gap analysis slides (PROBLEM_SOLUTION): Critical capability gaps
   - Tech audit findings (BENTO_GRID): System fragmentation or debt
5. RESOLUTION - What to do:
   - Strategic recommendations (CONTENT_DATA_PANEL): Each with impact metrics
   - Roadmap overview (FULL_WIDTH_VIZ): NOW/NEXT/LATER horizons
   - PRD highlights (CONTENT_DATA_PANEL): Top features and priorities
   - Architecture direction (CONTENT_INSIGHT_CHART or BENTO_GRID): Technical path forward
6. CLOSE (1-2 slides, CONTENT_DATA_PANEL): Specific next steps with WHO does WHAT by WHEN. No marketing CTAs.

CONTENT-DRIVEN SLIDE PLANNING - include slides for EVERY available deliverable:
${context.themes?.length ? `- Themes (${context.themes.length} available): Plan 1-2 slides showing theme landscape` : ''}
${context.personas?.length ? `- Personas (${context.personas.length} available): Plan 1 slide PER KEY persona (include persona image)` : ''}
${context.recommendations?.length ? `- Recommendations (${context.recommendations.length} available): Plan 2-3 slides` : ''}
${context.journeyStages?.length ? `- Service Blueprint (${context.journeyStages.length} stages): Plan 1-2 slides showing journey pain points` : ''}
${context.prd ? '- PRD available: Plan 1 slide showing top features and priorities' : ''}
${context.roadmap ? '- Roadmap available: Plan 1 slide showing NOW/NEXT/LATER' : ''}
${context.techArchitecture ? '- Tech Architecture available: Plan 1 slide' : ''}
${context.gapAnalysis ? '- Gap Analysis available: Plan 1-2 slides for critical gaps' : ''}
${context.techAudit ? '- Tech Audit available: Plan 1 slide showing system landscape' : ''}
${context.competitiveAnalysis ? '- Competitive Analysis available: Plan 1-2 slides' : ''}

Expected total: 15-30 slides depending on available deliverables. More data = more slides. NEVER artificially constrain.

LAYOUT VARIETY (monotony = AI slop):
- NEVER use the same archetype on more than 2 consecutive slides.
- The deck MUST use at least 4 of the 7 archetypes.
- Alternate between data-heavy (CONTENT_DATA_PANEL, CONTENT_INSIGHT_CHART) and narrative (BENTO_GRID, PROBLEM_SOLUTION) archetypes.
- Every SECTION_HEADER must be followed by a different archetype than the one before it.

7 SLIDE ARCHETYPES (use ONLY these):
- TITLE_SLIDE: Left-aligned title, section label, horizontal rule
- SECTION_HEADER: Full dark (#0D0D0D), ghost text, chartreuse section label. Title only, max 5 words. NEVER narration.
- CONTENT_DATA_PANEL: 55/45 split - text+bullets left, metric cards right
- CONTENT_INSIGHT_CHART: 55/45 split - text left, chart right
- FULL_WIDTH_VIZ: No split - heading + full-width data grid/table
- BENTO_GRID: 3-6 mixed cells (stats, quotes, indicators)
- PROBLEM_SOLUTION: 55/45 split - pain stat left, solution points right

SECTION_HEADER: Title only (2-5 words). NEVER narration. Examples: "The Landscape", "The Challenge", "The Path Forward"
CLOSING: NEVER "Ready to Innovate?" or any SaaS CTA. Specific next steps with Action + Owner + Timeline.

For persona slides: set personaRef to the persona name so we can inject their image.

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
${digest}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                storyArc: { type: Type.STRING },
                slides: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            slideNumber: { type: Type.INTEGER },
                            layout: { type: Type.STRING, enum: ['TITLE_SLIDE', 'SECTION_HEADER', 'CONTENT_DATA_PANEL', 'CONTENT_INSIGHT_CHART', 'FULL_WIDTH_VIZ', 'BENTO_GRID', 'PROBLEM_SOLUTION'] },
                            title: { type: Type.STRING },
                            rationale: { type: Type.STRING },
                            sourceDeliverable: { type: Type.STRING },
                            personaRef: { type: Type.STRING },
                        },
                        required: ["slideNumber", "layout", "title", "rationale", "sourceDeliverable"]
                    }
                }
            },
            required: ["methodology", "storyArc", "slides"]
        };
        const result = await this.executeStep<StepResult_Structure>(prompt, schema, [], onStream);
        if (!result.slides) result.slides = [];
        // Ensure every slide has a style object
        result.slides = result.slides.map(s => ({ ...s, style: s.style || { ...DEFAULT_STYLE } }));

        // --- STRUCTURE VALIDATION: Check deliverable coverage, slide count, persona slides ---
        try {
            const { validateDeckStructure } = await import('./slidePostProcessor');
            const availableDeliverables: string[] = [];
            if (context.themes?.length) availableDeliverables.push('themes');
            if (context.personas?.length) availableDeliverables.push('personas');
            if (context.journeyStages?.length) availableDeliverables.push('journey_map');
            if (context.prd) availableDeliverables.push('prd');
            if (context.roadmap) availableDeliverables.push('roadmap');
            if (context.techArchitecture) availableDeliverables.push('tech_architecture');
            if (context.gapAnalysis) availableDeliverables.push('gap_analysis');
            if (context.techAudit) availableDeliverables.push('tech_audit');
            if (context.competitiveAnalysis) availableDeliverables.push('competitive_analysis');
            if (context.recommendations?.length) availableDeliverables.push('recommendations');

            const validation = validateDeckStructure(result.slides, availableDeliverables);
            if (!validation.valid && !feedback) {
                // Auto-retry once with specific validation feedback
                console.log(`[DeckStructure] Validation failed (${validation.violations.length} violations), auto-retrying...`);
                onStream("Structure validation found gaps, refining...");
                return this.generateDeckStructure(validation.feedbackForRetry, context, onStream);
            }
            if (validation.violations.length > 0) {
                console.log(`[DeckStructure] ${validation.violations.length} validation warnings:`,
                    validation.violations.map(v => v.detail).join('; '));
            }
        } catch (e) {
            console.warn('[DeckStructure] Validation skipped:', e);
        }

        return result;
    }

    async generateNarrative(structure: StepResult_Structure, context: DeckInputContext, feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Narrative> {
        // =====================================================================
        // CONTENT-BLOCK NARRATIVE GENERATION (Report-Derived)
        //
        // Architecture: The AI declares WHAT to communicate using content blocks.
        // The layout resolver then determines HOW to present it (which archetype).
        // This eliminates: empty templates, broken layouts, missing evidence.
        //
        // Data flow: Strategic Report sections → per-slide injection → AI generates
        // content blocks → resolveLayout() picks archetype → mapToFields() produces
        // standard Slide objects that existing renderers understand.
        // =====================================================================

        // Report sections for per-slide matching
        const reportSections = context.strategicReport?.sections || [];

        const personaList = (context.personas || []).map(p =>
            `- ${p.name} (${p.role}): "${(p.quote || '').substring(0, 80)}" | JTBD: "${p.jtbd || 'N/A'}" [image: ${p.imageUrl ? 'AVAILABLE' : 'none'}]`
        ).join('\n');

        // Load wiki framework
        let frameworkPrompt = '';
        try {
            const { getEnhancedFrameworkPrompt } = await import('./deliverableFrameworks');
            frameworkPrompt = await getEnhancedFrameworkPrompt('STRATEGY_DECK');
        } catch (e) { console.warn('[Narrative] Framework load failed, using inline rules only'); }

        // Load wiki constraints for self-improvement (G11)
        let learnedConstraints = '';
        try {
            const constraints = getActiveConstraints();
            if (constraints) learnedConstraints = constraints;
        } catch (e) { /* no constraints available */ }

        // Load engagement memory for cross-session context (G12).
        // 2026-05-22 - Use buildEngagementSlug (which uses
        // extractResearchObjective + a canonical lowercase/hyphen/length
        // pipeline) so the slug computed HERE matches the slug computed
        // by the WRITER in App.tsx (Phase B persistDeliverable). Before
        // this fix, writer and reader produced different slugs for the
        // same goal, causing 404s on every recommendations / journey /
        // gap / competitive run.
        let engagementContext = '';
        try {
            const { loadEngagementMemory, buildEngagementSlug } = await import('./wikiService');
            const goalSlug = buildEngagementSlug(this.goal, 60);
            const memory = await loadEngagementMemory(goalSlug, this.goal);
            if (memory) engagementContext = `\nENGAGEMENT CONTEXT (from prior sessions on similar topics):\n${memory}\n`;
        } catch (e) { /* no engagement memory available */ }

        // Content-block schema - matches the SlideGeneration interface in types.ts
        const contentBlockSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['hero_stat', 'evidence_bullets', 'metric_cards', 'quote_block', 'persona_card', 'problem_statement', 'solution_points', 'data_grid', 'journey_strip', 'comparison_row', 'narrative_text', 'section_label'] },
                value: { type: Type.STRING },
                unit: { type: Type.STRING },
                context: { type: Type.STRING },
                text: { type: Type.STRING },
                attribution: { type: Type.STRING },
                source: { type: Type.STRING },
                severity: { type: Type.STRING },
                description: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                jtbd: { type: Type.STRING },
                quote: { type: Type.STRING },
                phase: { type: Type.STRING },
                action: { type: Type.STRING },
                pain: { type: Type.STRING },
                emotion: { type: Type.STRING },
                mot: { type: Type.BOOLEAN },
                dimension: { type: Type.STRING },
                ours: { type: Type.STRING },
                theirs: { type: Type.STRING },
                gap: { type: Type.STRING },
                items: { type: Type.ARRAY, items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        source: { type: Type.STRING },
                        chunkRef: { type: Type.STRING },
                        label: { type: Type.STRING },
                        value: { type: Type.STRING },
                        unit: { type: Type.STRING },
                        trend: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                    }
                }},
            },
            required: ['type']
        };

        // Per-slide schema for standalone Gemini calls
        const perSlideSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                blocks: { type: Type.ARRAY, items: contentBlockSchema },
                speakerNotes: { type: Type.STRING },
                sources: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['blocks', 'speakerNotes', 'sources']
        };

        // Build the shared prompt preamble for all per-slide calls
        const blockTypeReference = `CONTENT BLOCK TYPES (declare what the slide communicates - the engine picks the template):

1. hero_stat: A single dominant number that anchors the slide.
   Fields: { type: "hero_stat", value: "35%", unit: "decline", context: "Active usage declined after the Q2 release" }

2. evidence_bullets: 2-4 research findings, each citing a specific source.
   Fields: { type: "evidence_bullets", items: [{ text: "Buyers report slow, manual setup as the top blocker", source: "G2 Reviews" }, { text: "Support backlog recurs across the user forum", source: "Customer Forum" }] }

3. metric_cards: 2-4 KPI data points for a data panel.
   Fields: { type: "metric_cards", items: [{ label: "Churn rate", value: "35%", trend: "+12% YoY" }, { label: "Feature adoption", value: "23%", unit: "of accounts" }] }

4. quote_block: A VERBATIM quote from research with provenance.
   Fields: { type: "quote_block", text: "We waited three weeks for onboarding and nearly cancelled", attribution: "Ops lead, mid-market account", source: "Customer Forum" }

5. persona_card: Reference to a persona (portrait image auto-injected by renderer).
   Fields: { type: "persona_card", name: "Maria Alvarez", role: "Operations lead", jtbd: "Get the team to value fast", quote: "I don't have time to fight the tool" }

6. problem_statement: A challenge backed by evidence.
   Fields: { type: "problem_statement", value: "73%", description: "of accounts report the product did not deliver value in the first 90 days", severity: "critical" }

7. solution_points: 2-3 actionable recommendations.
   Fields: { type: "solution_points", items: [{ title: "Guided onboarding", description: "Replace manual setup with a guided import that reaches first value in days" }] }

8. data_grid: 3-6 data points for a grid/bento layout.
   Fields: { type: "data_grid", items: [{ label: "T1 Sources", value: "47", description: "Academic papers and government data" }] }

9. journey_strip: A service blueprint stage.
   Fields: { type: "journey_strip", phase: "Onboarding", action: "Account completes initial setup", pain: "Drop-off at the manual import step", emotion: "Frustrated", mot: true }

10. comparison_row: Competitive or gap comparison.
    Fields: { type: "comparison_row", dimension: "AI Readiness", ours: "2.1/5", theirs: "3.8/5", gap: "1.7 points behind" }

11. narrative_text: 2-3 sentence analytical prose for the slide body.
    Fields: { type: "narrative_text", text: "The convergence of three factors..." }

12. section_label: Section divider text (used alone for section header slides).
    Fields: { type: "section_label", text: "Research Findings" }`;

        const sharedRules = `BLOCK COMPOSITION RULES:
- EVERY body slide MUST have at least one block with source attribution (evidence_bullets, quote_block, or metric_cards with source)
- Use 2-5 blocks per slide - mix types for visual richness

META-NARRATION BAN (violation = instant rejection):
NEVER use: "Good morning" | "Welcome to" | "Today we will" | "We now move to" | "In this section" | "In this presentation" | "As you can see" | "This slide shows" | "Thank you" | "Allow me to" | "Before we begin" | "Let us examine"
LEAD with the insight. First word of the title = the finding.

STORYTELLING RULES:
- NEVER hedge: "It seems", "Perhaps", "It's possible that"
- Every title is a COMPLETE SENTENCE stating a conclusion (Pyramid Principle)
- Use SPECIFIC numbers, names, dates from the report sections - NEVER generalities
- Speaker notes: deeper context, audience objections, transition cues (NOT slide content)

PLAIN TEXT ONLY in all text fields. No **bold**, *italic*, # headers.

${feedback ? 'USER FEEDBACK (PRIORITY): ' + feedback : ''}`;

        // =====================================================================
        // PER-SLIDE GENERATION: Each body slide gets its own Gemini call
        // with ONLY its matched report section as context. This prevents
        // the model from being overwhelmed by all slides at once, producing
        // thicker, more evidence-rich content blocks per slide.
        // =====================================================================
        onStream('Generating content blocks per slide...');
        const rawSlides: any[] = [];
        const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const totalSlides = (structure.slides || []).length;

        // Build a map of slide -> matched report section for reuse
        const slideReportMap = new Map<number, any>();
        for (const slide of (structure.slides || [])) {
            const srcDel = (slide as any).sourceDeliverable || '';
            const slideTitle = (slide.title || '').toLowerCase();

            let matchingSections = reportSections.filter(s =>
                s.sourceDeliverable === srcDel ||
                (srcDel && s.sourceDeliverable && s.sourceDeliverable.includes(srcDel.split('_')[0])) ||
                s.title.toLowerCase().includes(slideTitle.substring(0, 25)) ||
                slideTitle.includes(s.title.toLowerCase().substring(0, 25))
            );

            if (matchingSections.length === 0) {
                const slideWords = slideTitle.split(/\s+/).filter(w => w.length > 4);
                matchingSections = reportSections.filter(s =>
                    slideWords.some(w => s.title.toLowerCase().includes(w) || (s.content || '').toLowerCase().substring(0, 200).includes(w))
                );
            }

            if (matchingSections.length > 0) {
                slideReportMap.set(slide.slideNumber, matchingSections[0]);
            }
        }

        for (const slide of (structure.slides || [])) {
            // SECTION_HEADER: Deterministic - no AI needed
            if (slide.layout === 'SECTION_HEADER') {
                rawSlides.push({
                    slideNumber: slide.slideNumber,
                    title: slide.title,
                    background: 'dark',
                    blocks: [{ type: 'section_label', text: slide.title }],
                    speakerNotes: '',
                    sources: []
                });
                continue;
            }

            // TITLE_SLIDE: Deterministic - no AI needed
            if (slide.layout === 'TITLE_SLIDE') {
                rawSlides.push({
                    slideNumber: slide.slideNumber,
                    title: slide.title,
                    background: 'dark',
                    blocks: [{ type: 'narrative_text', text: slide.rationale || '' }],
                    speakerNotes: '',
                    sources: []
                });
                continue;
            }

            // Body slide: make individual API call with matched report section
            onStream(`Generating slide ${slide.slideNumber} of ${totalSlides}...`);

            const matchedSection = slideReportMap.get(slide.slideNumber);
            const srcDel = (slide as any).sourceDeliverable || 'general';

            // Build persona context for this specific slide
            let personaContext = '';
            if ((slide as any).personaRef && personaList) {
                personaContext = `\nPERSONA IMAGE INJECTION:\nAvailable personas:\n${personaList}\nWhen referencing a persona, include a persona_card block with their exact name. The renderer injects their generated portrait.\n`;
            }

            const slidePrompt = `Generate 2-5 content blocks for this ONE slide.

${blockTypeReference}

${sharedRules}
${personaContext}
${frameworkPrompt ? `FRAMEWORK: ${frameworkPrompt.substring(0, 2000)}` : ''}
${learnedConstraints ? `LEARNED CONSTRAINTS: ${learnedConstraints}` : ''}

SLIDE TITLE: "${slide.title}"
SOURCE: ${srcDel}

${matchedSection ? `REPORT SECTION (distill this into content blocks):
${matchedSection.content}
${matchedSection.keyMetrics ? `KEY METRICS: ${matchedSection.keyMetrics.map((m: any) => `${m.label}=${m.value}${m.context ? ` (${m.context})` : ''}`).join(', ')}` : ''}
${matchedSection.keyQuote ? `KEY QUOTE: "${matchedSection.keyQuote.text}" -- ${matchedSection.keyQuote.attribution} (${matchedSection.keyQuote.source})` : ''}
SOURCES: ${(matchedSection.citations || []).join(', ')}` : `No matching report section found. Generate content from available context for source: ${srcDel}.`}

YOU MUST include:
- At least 1 evidence_bullets or quote_block with named sources
- At least 1 metric from the key metrics (as hero_stat or metric_cards) if available
- The key quote (as quote_block) if available
- All source names in the sources array

Output JSON.`;

            try {
                const slideResult = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: { parts: [{ text: slidePrompt }] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: perSlideSchema,
                        temperature: 0.3,
                    }
                }), 3, 2000, `Slide ${slide.slideNumber}`);

                const slideText = slideResult.text || '{}';
                const slideData = JSON.parse(tryRepairJson(slideText));

                rawSlides.push({
                    slideNumber: slide.slideNumber,
                    title: slide.title,
                    background: 'light',
                    blocks: slideData.blocks || [],
                    speakerNotes: slideData.speakerNotes || '',
                    sources: slideData.sources || [],
                    ...((slide as any).personaRef ? { personaRef: (slide as any).personaRef } : {})
                });
            } catch (slideError: any) {
                console.error(`[Narrative] Slide ${slide.slideNumber} generation failed:`, slideError.message);
                // Fallback: create a minimal slide with narrative_text from the report section
                rawSlides.push({
                    slideNumber: slide.slideNumber,
                    title: slide.title,
                    background: 'light',
                    blocks: matchedSection
                        ? [{ type: 'narrative_text', text: (matchedSection.content || '').substring(0, 500) }]
                        : [{ type: 'narrative_text', text: slide.rationale || slide.title }],
                    speakerNotes: '',
                    sources: matchedSection?.citations || [],
                    ...((slide as any).personaRef ? { personaRef: (slide as any).personaRef } : {})
                });
            }
        }

        onStream(`Generated content blocks for ${rawSlides.length} slides.`);

        // =====================================================================
        // LAYOUT RESOLUTION: Convert content blocks → standard Slide objects
        // The layout resolver maps blocks to the best archetype template and
        // translates block data to existing Slide interface fields so current
        // HTML/PPTX renderers work unchanged.
        // =====================================================================
        onStream(`Resolving layouts for ${rawSlides.length} slides...`);
        const { resolveLayout } = await import('./layoutResolver');

        const resolvedSlides: Slide[] = rawSlides.map((raw: any) => {
            const blocks: ContentBlock[] = raw.blocks || [];
            const bgPref = raw.background === 'dark' ? 'dark' : 'light';

            // Resolve layout from content blocks
            const { layout, mappedFields } = resolveLayout(blocks, bgPref);

            // Build the standard Slide object
            const slide: Slide = {
                slideNumber: raw.slideNumber,
                layout: layout,
                title: raw.title || '',
                content: mappedFields.content || [],
                narrative: mappedFields.narrative || '',
                speakerNotes: raw.speakerNotes || '',
                visualPrompt: '',
                quote: mappedFields.quote || '',
                sources: [...(mappedFields.sources || []), ...(raw.sources || [])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
                style: { ...DEFAULT_STYLE },
                // Archetype-specific fields from layout resolver
                metrics: mappedFields.metrics,
                bentoCells: mappedFields.bentoCells,
                problemStat: mappedFields.problemStat,
                solutionPoints: mappedFields.solutionPoints,
                // Persona fields
                personaName: mappedFields.personaName || raw.personaRef,
                personaRole: mappedFields.personaRole,
                personaQuote: mappedFields.personaQuote,
            };

            // Dark background styling
            if (bgPref === 'dark' || (layout as string) === 'SECTION_HEADER' || (layout as string) === 'TITLE_SLIDE') {
                slide.style = {
                    backgroundColor: '#0D0D0D',
                    headerColor: '#F5F5F0',
                    textColor: '#CCCCCC',
                    accentColor: '#B8B800',
                };
            }

            // SECTION_HEADER cleanup: force empty content
            if ((layout as string) === 'SECTION_HEADER') {
                slide.content = [];
                slide.narrative = '';
                slide.quote = '';
            }

            return slide;
        });

        // =====================================================================
        // DETERMINISTIC CONTENT ENRICHMENT: Inject report data into thin slides
        //
        // Even with content blocks, the AI may produce thin output. This step
        // directly pulls data from the strategic report sections into slides -
        // no AI involved, pure data transfer. This guarantees evidence reaches
        // the final deck regardless of AI generation quality.
        // =====================================================================
        if (context.strategicReport) {
            const reportSections = context.strategicReport.sections || [];
            onStream('Enriching slides with report evidence...');

            for (const slide of resolvedSlides) {
                if ((slide.layout as string) === 'SECTION_HEADER' || (slide.layout as string) === 'TITLE_SLIDE') continue;

                // Find the matching report section for this slide
                const slideTitle = (slide.title || '').toLowerCase();
                const matchedSection = reportSections.find(s => {
                    const srcMatch = structure.slides?.find(ss => ss.slideNumber === slide.slideNumber);
                    const srcDel = (srcMatch as any)?.sourceDeliverable || '';
                    return s.sourceDeliverable === srcDel ||
                        s.title.toLowerCase().includes(slideTitle.substring(0, 25)) ||
                        slideTitle.includes(s.title.toLowerCase().substring(0, 25));
                });

                if (!matchedSection) continue;

                // Inject metrics from report if slide has none
                if ((!slide.metrics || slide.metrics.length === 0) && matchedSection.keyMetrics?.length) {
                    slide.metrics = matchedSection.keyMetrics.map((m: any, i: number) => ({
                        label: m.label,
                        value: m.value,
                        unit: '',
                        accentColor: ['#CC6644', '#B8B800', '#00B7C3'][i % 3],
                    }));
                }

                // Inject quote from report if slide has none
                if (!slide.quote && matchedSection.keyQuote) {
                    slide.quote = `"${matchedSection.keyQuote.text}" -- ${matchedSection.keyQuote.attribution} (${matchedSection.keyQuote.source})`;
                }

                // Inject sources from report if slide has none
                if ((!slide.sources || slide.sources.length === 0) && matchedSection.citations?.length) {
                    slide.sources = matchedSection.citations.slice(0, 4);
                }

                // If content bullets are just short labels (<40 chars), enrich with report evidence
                const hasOnlyLabels = slide.content?.length && slide.content.every(c => c.length < 40);
                if (hasOnlyLabels && matchedSection.content) {
                    // Extract 2-3 evidence sentences from the report section
                    const sentences = matchedSection.content.split(/(?<=[.!?])\s+/).filter((s: string) => s.length > 50 && s.length < 250);
                    if (sentences.length >= 2) {
                        slide.content = sentences.slice(0, 3);
                    }
                }

                // If content is completely empty, pull from report
                if (!slide.content || slide.content.length === 0) {
                    const sentences = (matchedSection.content || '').split(/(?<=[.!?])\s+/).filter((s: string) => s.length > 50 && s.length < 250);
                    slide.content = sentences.slice(0, 3);
                }
            }
        }

        return { slides: resolvedSlides, videoScript: [] } as StepResult_Narrative;
    }

    // --- NEW OUTPUT GENERATORS (Sprint 4) ---

    async generateGapAnalysis(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('GAP_ANALYSIS'); } catch (e) { /* skill unavailable */ }

        // 2026-05-22 - Tight evidence-catalog cap because gap_analysis runs
        // late in the chain. 600K-char cap leaves headroom inside the 1M-token
        // model limit.
        const evidenceBlock = await this.assembleDeliverableCorpus('Gap Analysis', { tokenBudget: 50_000, minDistinctSources: 8 });
        this.registerGroundingText(evidenceBlock);   // Phase 1 corpus-identity: gap quotes from this catalog
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-23 - P0.1: Chunked-first gap analysis. Five capability domains
        // (people / process / technology / data / governance) generated in
        // parallel. Single-shot path truncated around domain 3-4.
        try {
            const { chunkedGenerateGapAnalysis } = await import('./deliverableChunkers');
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating gap analysis across 5 capability domains in parallel...');
            const chunkedResult = await chunkedGenerateGapAnalysis({
                goal: this.goal,
                skillInstructions,
                evidenceBlock,
                contextBlock: ctxBlock + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
            });
            const result = {
                methodology: chunkedResult.methodology,
                analysis: chunkedResult.analysis,
            };
            const gapValidation = validateDeliverableOutput(result, 'gap_analysis');
            if (!gapValidation.valid && !feedback) {
                const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: gapValidation.failures };
                onStream(`Quality gate: ${gapValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
                const reinforcedFeedback = shouldReinforce(sig)
                    ? buildReinforceFeedbackString({ priorAnswer: result, failures: gapValidation.failures, deliverableName: 'gap_analysis' })
                    : gapValidation.failures.join('. ');
                await appendUncertaintyLedger({ deliverableName: 'gap_analysis', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
                return this.generateGapAnalysis(reinforcedFeedback, onStream);
            }
            // 2026-05-25 - Expert panel: gap-analysis-evaluator + quantification-architect
            // (2 iterations to enforce dollar-quantified gap-impact per learned constraint:
            // "stakeholders require concrete financial metrics to assess gap cost") +
            // evidence-quality-auditor + pre-mortem.
            try {
                const { runExpertPanel } = await import('./artifactExpertPanel');
                const panelResult = await runExpertPanel({
                    deliverable: result,
                    kind: 'gap-analysis',
                } as any);
                // 2026-10-01 (plan 2.6, panels that DECIDE): a `withhold` or `fail` verdict does not ship
                // the artifact as if nothing happened. The result is returned FLAGGED so the caller
                // and the AIR record see the verdict; the findings ride on `_panelVerdict`.
                const verdict = (panelResult as any)?.verdict as string | undefined;
                if (verdict === 'withhold' || verdict === 'fail') {
                    onStream(`Gap-analysis expert panel verdict: ${verdict}; the artifact is held for review (${((panelResult as any).auditor_verdict?.blocking || []).join(', ') || 'rubric or critic failure'})`);
                    const held: any = { ...((panelResult?.result || result) as any), _panelVerdict: verdict, _panelFindings: (panelResult as any).auditor_verdict || null, _withheld: true };
                    return held;
                }
                if (panelResult?.result) {
                    onStream(`Gap-analysis expert panel: ${panelResult.panel_summary.experts_fired.length} critics fired, ${panelResult.panel_summary.critics_with_edits.length} produced edits, verdict ${verdict || 'pass'} ($${panelResult.total_cost_usd.toFixed(3)})`);
                    return { ...(panelResult.result as any), _panelVerdict: verdict || 'pass' };
                }
            } catch (panelErr: any) {
                // Plan 2.6: a panel that could not run is a degradation, not a pass. The artifact
                // ships flagged so the record never shows a clean verdict it did not earn.
                console.warn('[Gap Analysis] expert panel errored; artifact flagged unreviewed:', panelErr?.message || panelErr);
                return { ...(result as any), _panelVerdict: 'unreviewed', _panelError: String(panelErr?.message || panelErr).slice(0, 200) };
            }
            return result;
        } catch (chunkErr: any) {
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[Gap Analysis] chunked generation failed: ${msg}. Falling back to single-shot (KNOWN truncation risk).`);
            console.warn('[Gap Analysis] chunked path failed:', chunkErr);
            // Fall through to single-shot
        }

        // 2026-05-12 - R1 Verbalized Confidence on gap analysis. Severity
        // calls and maturity scores are exactly the claims where the model
        // routinely overreaches - VC tightens calibration on those.
        const gapVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'gap analysis',
            claimNoun: 'capability gap',
            claimNounPlural: 'capability gaps',
            maxHighFraction: 0.45,
        });
        const prompt = `${skillInstructions ? `=== AGENT SKILL: GAP ANALYSIS EVALUATOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${gapVcDirective}\nSTEP: GAP ANALYSIS. You are a senior management consultant performing a rigorous gap analysis.

CAPABILITY EXTRACTION METHOD - follow these steps to DERIVE gaps from the research:

STEP A: Extract capability areas from the THEMES identified in Step 2. Every theme implies a capability area.
  Example: Theme "AI-Powered Donor Matching" → Capability: "AI/ML donor prospect scoring and matching"
  Example: Theme "Data Integration Challenges" → Capability: "Cross-system data integration and governance"

STEP B: For each capability, determine CURRENT maturity from the EVIDENCE:
  - Look for pain points, complaints, workarounds mentioned in the corpus
  - If a corpus chunk says "staff manually entering data across 5 systems" → current maturity = 1 (ad hoc)
  - If "recently implemented a CRM but adoption is low" → current maturity = 2 (developing)
  - Score: 1=ad hoc/manual, 2=developing/piloting, 3=defined/documented, 4=managed/measured, 5=optimized/automated
  - evidence: MUST cite specific [CHUNK_XXX] that justifies this maturity score

STEP C: Determine TARGET maturity from recommendations and best practices in the corpus:
  - What do leading organizations do? What does the research recommend?
  - targetMaturity: 4 or 5 for critical capabilities, 3 for supporting ones

STEP D: Calculate GAPS (target - current). EVERY capability where current < target produces a gap.

REQUIREMENTS:
- Generate AT LEAST 6 capability gaps. If you found 8 themes, you should have 8+ gaps.
- assessmentScope: 2-3 sentences defining the analysis domain
- Each gap MUST have: capability, currentMaturity, targetMaturity, gap (number), severity, impact (with [CHUNK_XXX]), effort, citations (array of source names), evidenceBasis (1-2 sentences with specific data proving the maturity gap)
- severity: "critical" if gap >= 3 or if the impact is existential; "high" if gap = 2; "medium" if gap = 1
- prioritizedActions: AT LEAST 4 actions, each referencing a specific gap by name
- quickWins: AT LEAST 2 items where effort is low but impact is high
- riskRegister: AT LEAST 3 risks with likelihood, impact, mitigation

ANTI-PATTERNS:
- Returning 0 gaps (impossible - every corpus has capability gaps)
- Gaps without [CHUNK_XXX] evidence citations
- Generic capability names ("improve technology") - be specific

ANTI-FABRICATION (composer rule 8): NEVER invent maturity scores. Each currentMaturity score MUST be backed by specific catalog evidence (e.g., "Reddit post describes manual data entry across 5 systems → maturity 1"). If you cannot find catalog evidence for a maturity assessment, do NOT include the gap. Made-up scores anywhere are grounds for rejection.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                analysis: { type: Type.OBJECT, properties: {
                    assessmentScope: { type: Type.STRING },
                    currentState: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, maturity: { type: Type.NUMBER }, evidence: { type: Type.STRING } }, required: ["capability", "maturity", "evidence"] } },
                    desiredState: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, targetMaturity: { type: Type.NUMBER }, rationale: { type: Type.STRING } }, required: ["capability", "targetMaturity", "rationale"] } },
                    gaps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, currentMaturity: { type: Type.NUMBER }, targetMaturity: { type: Type.NUMBER }, gap: { type: Type.NUMBER }, severity: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING }, confidence: { type: Type.STRING }, confidenceRationale: { type: Type.STRING } }, required: ["capability", "currentMaturity", "targetMaturity", "gap", "severity", "impact", "effort", "citations", "evidenceBasis"] } },
                    prioritizedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, priority: { type: Type.STRING }, timeline: { type: Type.STRING }, gapReference: { type: Type.STRING } }, required: ["action", "priority", "timeline"] } },
                    quickWins: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } }, required: ["action", "impact", "effort"] } },
                    riskRegister: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { risk: { type: Type.STRING }, likelihood: { type: Type.STRING }, impact: { type: Type.STRING }, mitigation: { type: Type.STRING } }, required: ["risk", "likelihood", "impact", "mitigation"] } },
                }, required: ["assessmentScope", "currentState", "desiredState", "gaps", "prioritizedActions", "quickWins", "riskRegister"] },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "analysis"]
        };
        const gapResult = await this.executeStepResilient<any>(prompt, schema, [], onStream, 'GapAnalysis', /* groundedViaManifest */ true);
        const analysis = gapResult?.analysis || {};
        // 2026-05-12 - R1 calibration inspection on gaps.
        const gapAssessment = normalizeSelfAssessment(gapResult?.selfAssessment);
        if (gapAssessment) gapResult.selfAssessment = gapAssessment; else delete gapResult?.selfAssessment;
        inspectCalibration('gap-analysis', (analysis?.gaps || []) as any[], gapAssessment, 0.45);

        // Phase 2: Enrich thin gaps + fill missing actions/risks
        const gaps = analysis.gaps || [];
        const thinGaps = gaps.filter((g: any) => !g.citations?.length || !g.evidenceBasis);
        if (thinGaps.length > 0) {
            onStream(`Enriching ${thinGaps.length} gaps with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const gap of thinGaps) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: `Enrich this capability gap with evidence.\n\nCapability: ${gap.capability}\nCurrent: ${gap.currentMaturity}/5, Target: ${gap.targetMaturity}/5\nSeverity: ${gap.severity}\nImpact: ${gap.impact}\n\nProvide:\n1. citations: 2-3 source names evidencing this gap\n2. evidenceBasis: 1-2 sentences with specific data proving the maturity assessment\n\nOutput JSON.` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich gap: ${gap.capability.substring(0, 30)}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length) gap.citations = enriched.citations;
                    if (enriched.evidenceBasis) gap.evidenceBasis = enriched.evidenceBasis;
                } catch (e: any) {
                    // P0.4 - surface gap-enrichment failure per gap so the
                    // user knows which gaps are thin in the final output.
                    onStream(`[Gap] enrichment failed for "${gap.capability?.slice(0, 50) || 'unnamed gap'}": ${e?.message || e}`);
                }
            }
        }

        // Phase 2B: Generate missing actions/risks if truncated
        if ((analysis.prioritizedActions?.length || 0) < 3 || (analysis.riskRegister?.length || 0) < 2) {
            onStream('Generating prioritized actions and risk register...');
            try {
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const actionsResp = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: { parts: [{ text: `Based on these capability gaps, generate prioritized actions and a risk register.\n\nGaps: ${gaps.map((g: any) => `[${g.severity}] ${g.capability}: gap ${g.gap}`).join('; ')}\n\nProvide:\n1. prioritizedActions: 4-6 actions (action, priority, timeline, gapReference)\n2. quickWins: 2-3 items (action, impact, effort)\n3. riskRegister: 3-5 risks (risk, likelihood, impact, mitigation)\n\nOutput JSON.` }] },
                    config: { responseMimeType: 'application/json', temperature: 0.2 }
                }), 2, 2000, 'Gap actions/risks');
                const actionsData = JSON.parse(tryRepairJson(actionsResp.text || '{}'));
                if (actionsData.prioritizedActions?.length > (analysis.prioritizedActions?.length || 0)) analysis.prioritizedActions = actionsData.prioritizedActions;
                if (actionsData.quickWins?.length > (analysis.quickWins?.length || 0)) analysis.quickWins = actionsData.quickWins;
                if (actionsData.riskRegister?.length > (analysis.riskRegister?.length || 0)) analysis.riskRegister = actionsData.riskRegister;
            } catch (e: any) {
                // P0.4 - surface gap actions/risks generation failure.
                onStream(`[Gap] prioritized actions / risk register generation failed (${e?.message || e}); deliverable shipped without them.`);
            }
        }

        // Validate
        const gapValidation = validateDeliverableOutput(gapResult, 'gap_analysis');
        if (!gapValidation.valid && !feedback) {
            const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: gapValidation.failures };
            onStream(`Quality gate: ${gapValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: gapResult, failures: gapValidation.failures, deliverableName: 'gap_analysis' })
                : gapValidation.failures.join('. ');
            await appendUncertaintyLedger({ deliverableName: 'gap_analysis', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
            return this.generateGapAnalysis(reinforcedFeedback, onStream);
        }

        this._finalizeDeliverable('gap', gapResult);
        return gapResult;
    }

    async generateTechAudit(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('TECH_AUDIT'); } catch (e) { /* skill unavailable */ }

        const evidenceBlock = await this.assembleDeliverableCorpus('Technology Audit', { tokenBudget: 30_000, minDistinctSources: 6 });
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-23 - P0.1: Chunked-first tech audit. Inventory pass (1 small call)
        // then per-system parallel audit (8+ systems). Single-shot path truncated
        // at 1-2 systems due to output token limits.
        try {
            const { chunkedGenerateTechAudit } = await import('./deliverableChunkers');
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating tech audit: inventory pass + per-system parallel audit...');
            const chunkedResult = await chunkedGenerateTechAudit({
                goal: this.goal,
                skillInstructions,
                evidenceBlock,
                contextBlock: ctxBlock + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
            });
            const result = {
                methodology: chunkedResult.methodology,
                audit: chunkedResult.audit,
            };
            const techAuditValidation = validateDeliverableOutput(result, 'tech_audit');
            if (!techAuditValidation.valid && !feedback) {
                const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: techAuditValidation.failures };
                onStream(`Quality gate: ${techAuditValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
                const reinforcedFeedback = shouldReinforce(sig)
                    ? buildReinforceFeedbackString({ priorAnswer: result, failures: techAuditValidation.failures, deliverableName: 'tech_audit' })
                    : techAuditValidation.failures.join('. ');
                await appendUncertaintyLedger({ deliverableName: 'tech_audit', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
                return this.generateTechAudit(reinforcedFeedback, onStream);
            }
            return result;
        } catch (chunkErr: any) {
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[Tech Audit] chunked generation failed: ${msg}. Falling back to single-shot (KNOWN truncation risk).`);
            console.warn('[Tech Audit] chunked path failed:', chunkErr);
            // Fall through to single-shot
        }

        // TWO-PHASE: Systems inventory first, then analysis.
        // Single-call approach truncates to 1 system due to output token limits.

        // 2026-05-12 - R1 Verbalized Confidence on systems inventory. Vendor
        // and integration claims fabricate easily; VC tightens calibration on
        // those by forcing the model to flag unverified systems.
        const auditVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'tech audit',
            claimNoun: 'system',
            claimNounPlural: 'systems',
            maxHighFraction: 0.50,
        });
        onStream("Phase A: Scanning for technology systems...");
        const inventoryPrompt = `${skillInstructions ? `=== AGENT SKILL: TECH AUDIT INSPECTOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${auditVcDirective}\nTECH AUDIT: SYSTEMS INVENTORY.
Research goal: "${this.goal}".

Scan the entire research corpus for EVERY mention of technology systems, software platforms, tools, databases, APIs, vendors, and digital processes. You MUST find at least 8 systems. If the research mentions any organization, they use technology - identify it.

LOOK FOR:
- CRM systems (Salesforce, HubSpot, etc.)
- ERP/SIS systems (Banner, Workday, PeopleSoft, Ellucian, etc.)
- LMS platforms (Canvas, Blackboard, Moodle, Brightspace, etc.)
- Data/Analytics tools (Tableau, Power BI, Snowflake, Google Analytics, etc.)
- Communication platforms (email, SMS, social media management tools)
- Cloud infrastructure (AWS, Azure, GCP, on-premise servers)
- AI/ML tools mentioned or recommended in the research
- Custom/internal applications, web portals, mobile apps
- Integration middleware, APIs, ETL pipelines

For each system found:
- name: Exact system name from evidence
- vendor: Company/provider
- category: CRM | ERP | LMS | Analytics | Communication | Database | Custom | Cloud | AI/ML | Other
- users: Who uses it
- department: Which department owns it
- status: active | legacy | deprecated | planned
- citations: Array of source names where this system was mentioned (e.g., ["Client SOW", "Industry Trade Press", "Reddit"])
- evidenceBasis: 1 sentence with specific evidence of this system's role or issues (e.g., "SOW mentions Raiser's Edge NXT as primary CRM but staff report 40% of data entry is manual")

Generate at LEAST 8 systems. If the corpus mentions an organization, that organization has a CRM, a website, email, databases, and likely an LMS - include them even if the specific vendor isn't named (label as "Unspecified CRM" etc.).

ANTI-FABRICATION (composer rule 8): NEVER invent vendor names. If the catalog mentions "the CRM" but does not name a specific vendor, label it "Unspecified CRM" - do NOT make up "Salesforce" or "HubSpot". Made-up vendor names anywhere are grounds for rejection.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}`;

        // Use standalone call to avoid chat context pollution
        const inventorySchema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                systems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    name: { type: Type.STRING }, vendor: { type: Type.STRING }, category: { type: Type.STRING },
                    users: { type: Type.STRING }, department: { type: Type.STRING }, status: { type: Type.STRING },
                    citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING },
                    confidence: { type: Type.STRING }, confidenceRationale: { type: Type.STRING }
                }, required: ["name", "category", "status", "citations", "evidenceBasis"] } },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "systems"]
        };
        const inventory = await this.executeStep<any>(inventoryPrompt, inventorySchema, [], onStream, /* groundedViaManifest */ true);
        const systems = inventory.systems || [];
        // 2026-05-12 - R1 calibration inspection on tech audit systems.
        const auditAssessment = normalizeSelfAssessment(inventory?.selfAssessment);
        if (auditAssessment) inventory.selfAssessment = auditAssessment; else delete inventory?.selfAssessment;
        inspectCalibration('tech-audit', systems as any[], auditAssessment, 0.50);

        onStream(`Found ${systems.length} systems. Phase B: Analyzing integrations and capabilities...`);
        const analysisPrompt = `STEP: TECH AUDIT PHASE B - INTEGRATION & CAPABILITY ANALYSIS.
Systems found: ${systems.map((s: any) => s.name).join(', ')}.

Now provide:
1. integrationMap: Connections BETWEEN these systems. For each integration pair, provide ALL fields:
   - source: source system name
   - target: target system name
   - method: integration method (API/batch/manual/event/middleware/none)
   - health: current status (healthy/degraded/broken/planned)
   - dataFlow: what data moves between them (specific data types)
   - direction: "unidirectional" or "bidirectional"
   - priority: "must-have" or "should-have" or "could-have"
   - risk: one sentence on what breaks if this integration fails
   - effort: estimated implementation effort (low/medium/high)
   CRITICAL: Show ALL integration pairs, not just one. If there are 12 systems, there could be 20-30 integrations.
2. capabilityMatrix: 5-8 organizational capabilities scored on maturity 1-5 with gap to target.
3. consolidationOpportunities: Where multiple systems serve the same function.
4. recommendations: Technology-specific actions with evidence.
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const analysisSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                integrationMap: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, method: { type: Type.STRING }, health: { type: Type.STRING }, dataFlow: { type: Type.STRING }, direction: { type: Type.STRING }, priority: { type: Type.STRING }, risk: { type: Type.STRING }, effort: { type: Type.STRING } } } },
                capabilityMatrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, currentMaturity: { type: Type.NUMBER }, targetMaturity: { type: Type.NUMBER }, gap: { type: Type.NUMBER } } } },
                consolidationOpportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } } } },
                recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impactLevel: { type: Type.STRING }, actionItems: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
            },
            required: ["integrationMap", "capabilityMatrix", "recommendations"]
        };
        const analysis = await this.executeStep<any>(analysisPrompt, analysisSchema, [], onStream);

        const techAuditResult: any = {
            methodology: inventory.methodology,
            audit: {
                systemsInventory: systems,
                integrationMap: analysis.integrationMap || [],
                capabilityMatrix: analysis.capabilityMatrix || [],
                consolidationOpportunities: analysis.consolidationOpportunities || [],
                recommendations: analysis.recommendations || [],
            }
        };
        // 2026-05-12 - preserve the R1 selfAssessment envelope on the rolled-up result
        if (inventory?.selfAssessment) techAuditResult.selfAssessment = inventory.selfAssessment;

        // Validate and auto-retry if evidence is thin
        const techAuditValidation = validateDeliverableOutput(techAuditResult, 'tech_audit');
        if (!techAuditValidation.valid && !feedback) {
            const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: techAuditValidation.failures };
            onStream(`Quality gate: ${techAuditValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: techAuditResult, failures: techAuditValidation.failures, deliverableName: 'tech_audit' })
                : techAuditValidation.failures.join('. ');
            await appendUncertaintyLedger({ deliverableName: 'tech_audit', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
            return this.generateTechAudit(reinforcedFeedback, onStream);
        }

        this._finalizeDeliverable('tech_audit', techAuditResult);
        return techAuditResult;
    }

    async generateCompetitiveAnalysis(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        // 2026-05-23 - P0.1: Chunked-first competitive analysis. Peer discovery
        // (1 small call) + per-peer parallel extended profile. Single-shot path
        // truncated mid-matrix on competitive analyses with 4+ peers.
        try {
            let _skill = '';
            try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); _skill = await loadSkillPrompt('COMPETITIVE'); } catch { /* skill unavailable */ }
            const _ev = await this.assembleDeliverableCorpus('Competitive Analysis', { tokenBudget: 50_000, minDistinctSources: 8 });
            const _ctx = renderDeliverableContextBlock(await loadDeliverableContext(this.goal));
            const accumulatedContextBlock = this.accumulatedContext.length > 0
                ? '=== PRIOR STAGES ===\n' +
                  this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
                  '\n=== END PRIOR STAGES ===\n'
                : '';
            onStream('Generating competitive analysis: peer discovery + per-peer parallel profiles...');
            const { chunkedGenerateCompetitive } = await import('./deliverableChunkers');
            const chunkedResult = await chunkedGenerateCompetitive({
                goal: this.goal,
                skillInstructions: _skill,
                evidenceBlock: _ev,
                contextBlock: _ctx + '\n' + accumulatedContextBlock,
                feedback,
                themes: [],
            });
            const result = {
                methodology: chunkedResult.methodology,
                analysis: chunkedResult.analysis,
            };
            const compValidation = validateDeliverableOutput(result, 'competitive_analysis');
            if (!compValidation.valid && !feedback) {
                const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: compValidation.failures };
                onStream(`Quality gate: ${compValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
                const reinforcedFeedback = shouldReinforce(sig)
                    ? buildReinforceFeedbackString({ priorAnswer: result, failures: compValidation.failures, deliverableName: 'competitive_analysis' })
                    : compValidation.failures.join('. ');
                await appendUncertaintyLedger({ deliverableName: 'competitive_analysis', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
                return this.generateCompetitiveAnalysis(reinforcedFeedback, onStream);
            }
            return result;
        } catch (chunkErr: any) {
            const msg = chunkErr?.message || String(chunkErr);
            onStream(`[Competitive] chunked generation failed: ${msg}. Falling back to single-shot (KNOWN truncation risk).`);
            console.warn('[Competitive] chunked path failed:', chunkErr);
            // Fall through to single-shot
        }
        // ORIGINAL SINGLE-SHOT PATH BELOW (kept as fallback)
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('COMPETITIVE_ANALYSIS'); } catch (e) { /* skill unavailable */ }

        // 2026-05-22 - Same evidence-catalog cap rationale as gap_analysis.
        // Competitive analysis is the LAST deliverable in the auto-chain, so
        // accumulated state is at its largest. 600K-char cap.
        const evidenceBlock = await this.assembleDeliverableCorpus('Competitive Analysis', { tokenBudget: 50_000, minDistinctSources: 8 });
        const ctx = await loadDeliverableContext(this.goal);
        const ctxBlock = renderDeliverableContextBlock(ctx);

        // 2026-05-12 - R1 Verbalized Confidence on competitive peers. Named
        // entity strength claims and maturity scores fabricate easily; VC
        // forces the model to flag peers where it overreached.
        const competitiveVcDirective = buildVerbalizedConfidenceDirective({
            deliverable: 'competitive analysis',
            claimNoun: 'peer',
            claimNounPlural: 'peers',
            maxHighFraction: 0.50,
        });
        const prompt = `${skillInstructions ? `=== AGENT SKILL: COMPETITIVE ANALYST ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}${competitiveVcDirective}\nSTEP: COMPETITIVE & LANDSCAPE ANALYSIS. You are a senior industry analyst.

TWO ANALYSIS MODES - use BOTH:

MODE 1: NAMED ENTITIES - Extract every organization, vendor, platform, institution, or product mentioned BY NAME in the corpus.
  - Search ALL chunks for proper nouns: company names, university names, software products, vendors, government agencies
  - Example: If corpus mentions "Salesforce", "HubSpot", "Acme Corp", "Globex" - these are peers/players
  - For each named entity found: name, role in the ecosystem, strengths (from evidence), weaknesses (from evidence)
  - MUST cite [CHUNK_XXX] for every claim about a named entity

MODE 2: ARCHETYPE ANALYSIS - When the corpus discusses TYPES of organizations rather than specific names:
  - Extract organizational archetypes (e.g., "Large R1 Universities", "Small Liberal Arts Colleges", "Community Colleges", "Tech-Forward Institutions")
  - For each archetype: typical characteristics, strategic position, advantages, challenges
  - These supplement the named entities to create a complete competitive landscape

INDUSTRY CONTEXT: 4-6 sentences describing the competitive/strategic landscape. What forces are reshaping this space? What's at stake?

PEERS (combine Mode 1 + Mode 2): Generate AT LEAST 4 peer profiles. If the corpus names 6+ organizations, include them all.
- name: Exact name from corpus OR archetype name
- position: 1-2 sentence market position description
- strengths: 2-4 evidence-backed strengths with [CHUNK_XXX]
- weaknesses: 1-3 evidence-backed weaknesses with [CHUNK_XXX]
- differentiators: 1-3 unique capabilities or positions
- isArchetype: true if this is an archetype, false if named entity

BENCHMARK DIMENSIONS: 5-7 strategic dimensions derived from the research themes.
  - dimension: Specific capability (NOT generic like "Technology" - say "AI-Powered Donor Engagement Maturity")
  - weight: 0.0-1.0 importance based on research priority
  - description: What "best in class" looks like for this dimension
  - evidenceBasis: Which [CHUNK_XXX] references inform this dimension

MATURITY MATRIX: Score EVERY peer on EVERY dimension (1-5 scale).
  - Each score MUST have a brief justification (1 sentence)

GAP SUMMARY: For EVERY dimension:
  - ourScore: Inferred from the research subject's current state (from themes + pain points)
  - bestInClass: Highest peer score and WHO achieves it
  - gap: Numerical difference
  - urgency: "immediate" | "near-term" | "long-term"
  - action: Specific action to close the gap with [CHUNK_XXX] evidence

ANTI-PATTERNS (will be rejected):
- Returning 0 peers (impossible - every corpus references organizations or organizational types)
- Generic industry context without evidence citations
- Maturity scores without justification
- Missing gap actions

ANTI-FABRICATION (composer rule 8): NEVER invent peer names, market-share percentages, or maturity scores. Each named peer MUST appear by exact name in the catalog above. If you can only identify archetypes, set isArchetype=true - do NOT make up specific company names. Maturity scores require a 1-sentence justification grounded in catalog evidence. Made-up "Salesforce.org scores 4.2/5 in AI maturity" anywhere is grounds for rejection.

${ctxBlock}
${evidenceBlock}
${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                analysis: { type: Type.OBJECT, properties: {
                    industryContext: { type: Type.STRING },
                    peers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        name: { type: Type.STRING },
                        position: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        differentiators: { type: Type.ARRAY, items: { type: Type.STRING } },
                        isArchetype: { type: Type.BOOLEAN },
                        citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        evidenceBasis: { type: Type.STRING },
                        confidence: { type: Type.STRING },
                        confidenceRationale: { type: Type.STRING }
                    }, required: ["name", "position", "strengths", "weaknesses", "differentiators", "citations", "evidenceBasis"] } },
                    benchmarkDimensions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        dimension: { type: Type.STRING },
                        weight: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                        evidenceBasis: { type: Type.STRING }
                    }, required: ["dimension", "weight", "description"] } },
                    maturityMatrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        peer: { type: Type.STRING },
                        scores: { type: Type.OBJECT, properties: {} }
                    }, required: ["peer", "scores"] } },
                    gapSummary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        dimension: { type: Type.STRING },
                        ourScore: { type: Type.NUMBER },
                        bestInClass: { type: Type.NUMBER },
                        bestInClassName: { type: Type.STRING },
                        gap: { type: Type.NUMBER },
                        urgency: { type: Type.STRING },
                        action: { type: Type.STRING }
                    }, required: ["dimension", "ourScore", "bestInClass", "gap", "action"] } },
                }, required: ["industryContext", "peers", "benchmarkDimensions", "maturityMatrix", "gapSummary"] },
                selfAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        overallConfidence: { type: Type.STRING },
                        leastDefensibleClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                    },
                },
            },
            required: ["methodology", "analysis"]
        };
        const compResult = await this.executeStepResilient<any>(prompt, schema, [], onStream, 'CompetitiveAnalysis', /* groundedViaManifest */ true);
        const analysis = compResult?.analysis || {};
        // 2026-05-12 - R1 calibration inspection on competitive peers.
        const compAssessment = normalizeSelfAssessment(compResult?.selfAssessment);
        if (compAssessment) compResult.selfAssessment = compAssessment; else delete compResult?.selfAssessment;
        inspectCalibration('competitive-analysis', (analysis?.peers || []) as any[], compAssessment, 0.50);

        // Phase 2: Enrich thin peers + fill missing dimensions/matrix/gaps
        const peers = analysis.peers || [];
        const thinPeers = peers.filter((p: any) => !p.citations?.length || !p.evidenceBasis);
        if (thinPeers.length > 0) {
            onStream(`Enriching ${thinPeers.length} competitive peers with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const peer of thinPeers) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: `Enrich this competitive peer with evidence.\n\nName: ${peer.name}\nPosition: ${peer.position}\nStrengths: ${(peer.strengths || []).join(', ')}\n\nProvide:\n1. citations: 2-3 source names where this peer was mentioned\n2. evidenceBasis: 1-2 sentences with specific competitive intelligence data\n3. weaknesses: 2-3 evidence-backed weaknesses (if thin)\n\nOutput JSON.` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich peer: ${peer.name}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length) peer.citations = enriched.citations;
                    if (enriched.evidenceBasis) peer.evidenceBasis = enriched.evidenceBasis;
                    if (enriched.weaknesses?.length > (peer.weaknesses?.length || 0)) peer.weaknesses = enriched.weaknesses;
                } catch (e) { /* non-blocking */ }
            }
        }

        // Phase 2B: Generate missing benchmarkDimensions/maturityMatrix/gapSummary
        if ((analysis.benchmarkDimensions?.length || 0) < 3 || (analysis.gapSummary?.length || 0) < 3) {
            onStream('Generating benchmark dimensions and gap summary...');
            try {
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const dimResp = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: { parts: [{ text: `Based on these competitive peers, generate benchmark dimensions, maturity scores, and gap summary.\n\nPeers: ${peers.map((p: any) => p.name).join(', ')}\nIndustry: ${analysis.industryContext || ''}\n\nProvide:\n1. benchmarkDimensions: 5-7 strategic dimensions (dimension, weight 0-1, description)\n2. maturityMatrix: Score each peer on each dimension (1-5)\n3. gapSummary: For each dimension: ourScore, bestInClass, gap, urgency, action\n\nOutput JSON.` }] },
                    config: { responseMimeType: 'application/json', temperature: 0.2 }
                }), 2, 2000, 'Competitive dimensions/matrix');
                const dimData = JSON.parse(tryRepairJson(dimResp.text || '{}'));
                if (dimData.benchmarkDimensions?.length > (analysis.benchmarkDimensions?.length || 0)) analysis.benchmarkDimensions = dimData.benchmarkDimensions;
                if (dimData.maturityMatrix?.length > (analysis.maturityMatrix?.length || 0)) analysis.maturityMatrix = dimData.maturityMatrix;
                if (dimData.gapSummary?.length > (analysis.gapSummary?.length || 0)) analysis.gapSummary = dimData.gapSummary;
            } catch (e) { /* non-blocking */ }
        }

        // Validate
        const compValidation = validateDeliverableOutput(compResult, 'competitive_analysis');
        if (!compValidation.valid && !feedback) {
            const sig = { overallConfidence: 'MEDIUM', leastDefensibleClaims: [] as string[], validationFailures: compValidation.failures };
            onStream(`Quality gate: ${compValidation.failures.slice(0, 3).join('; ')}. Reinforcing with anchored re-ask...`);
            const reinforcedFeedback = shouldReinforce(sig)
                ? buildReinforceFeedbackString({ priorAnswer: compResult, failures: compValidation.failures, deliverableName: 'competitive_analysis' })
                : compValidation.failures.join('. ');
            await appendUncertaintyLedger({ deliverableName: 'competitive_analysis', timestamp: new Date().toISOString(), triggerScore: shouldReinforce(sig) ? 0.5 : 0.2, overallConfidence: sig.overallConfidence, leastDefensibleClaims: sig.leastDefensibleClaims, validationFailures: sig.validationFailures, resolution: 'reinforced' });
            return this.generateCompetitiveAnalysis(reinforcedFeedback, onStream);
        }

        this._finalizeDeliverable('competitive', compResult);
        return compResult;
    }

    // ============================================================
    // STRATEGIC REPORT GENERATION (Report-First Architecture)
    // ============================================================

    /**
     * Generate a comprehensive strategic report synthesizing ALL deliverables.
     * This is the unrestricted narrative layer - no character budgets, no slide templates.
     * The deck is derived FROM this report, not from raw truncated metadata.
     */
    async generateStrategicReport(context: DeckInputContext, feedback: string | undefined, onStream: (t: string) => void, rawSources?: any[]): Promise<any> {
        // Load Agent Skill for strategic report writing
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('STRATEGIC_REPORT'); } catch (e) { /* skill unavailable */ }

        // Load chunk-to-source map so we can resolve CHUNK_XXX → real source names
        let chunkMap: Record<string, { sourceName: string; title: string; url?: string }> = {};
        try {
            const { getChunkSourceMap } = await import('./researchFabricOrchestrator');
            chunkMap = getChunkSourceMap();
        } catch (e) { /* no map available */ }

        // Resolve a CHUNK_XXX reference to human-readable "SourceName: ArticleTitle"
        const resolveChunk = (ref: string): string => {
            const info = chunkMap[ref] || chunkMap[ref.replace(/[\[\]]/g, '')];
            if (info) return `${info.sourceName}: "${info.title}"`;
            return ref;
        };

        // Resolve all CHUNK_XXX references in a text string
        const resolveChunksInText = (text: string): string => {
            if (!text) return text;
            return text.replace(/\[?(CHUNK_\d+)\]?/g, (match, chunkId) => {
                const resolved = resolveChunk(chunkId);
                return resolved !== chunkId ? `[${resolved}]` : match;
            });
        };

        // Build full-depth serialization of each deliverable (NO truncation, RESOLVED citations)
        const serializeThemes = (themes: any[]) => themes.map((t, i) => {
            const citations = (t.citations || []).map((c: any) => {
                const name = c.sourceName || resolveChunk(c.sourceFile || '') || 'Unknown';
                const quote = c.text ? ` - "${c.text.substring(0, 100)}"` : '';
                return `${name}${quote}`;
            });
            // 2026-05-31 (Phase B2) - Serialize the Pass-2 DEPTH fields so the
            // richest synthesis the app produces (subThemes / dimensions /
            // contradictions / temporalArc / implications) actually reaches the
            // strategic report. Previously dropped -> report themes were shallow.
            const depth: string[] = [];
            if (Array.isArray(t.subThemes) && t.subThemes.length) {
                depth.push(`Sub-themes:\n${t.subThemes.map((s: any) => `  - ${typeof s === 'string' ? s : (s.name || s.title || '')}${s && s.description ? ': ' + resolveChunksInText(s.description) : ''}`).join('\n')}`);
            }
            if (Array.isArray(t.dimensions) && t.dimensions.length) {
                depth.push(`Dimensions:\n${t.dimensions.map((d: any) => `  - ${typeof d === 'string' ? d : (d.axis ? d.axis + ': ' + (d.value ?? '') : JSON.stringify(d))}`).join('\n')}`);
            }
            if (Array.isArray(t.contradictions) && t.contradictions.length) {
                depth.push(`Contradictions / tensions:\n${t.contradictions.map((c: any) => `  - ${resolveChunksInText(typeof c === 'string' ? c : (c.description || c.text || JSON.stringify(c)))}`).join('\n')}`);
            }
            if (t.temporalArc) depth.push(`Temporal arc: ${resolveChunksInText(typeof t.temporalArc === 'string' ? t.temporalArc : JSON.stringify(t.temporalArc))}`);
            if (Array.isArray(t.implications) && t.implications.length) {
                depth.push(`Implications:\n${t.implications.map((im: any) => `  - ${resolveChunksInText(typeof im === 'string' ? im : (im.text || im.description || JSON.stringify(im)))}`).join('\n')}`);
            }
            const depthBlock = depth.length ? `\n${depth.join('\n')}` : '';
            return `Theme ${i+1}: ${t.name}\nDescription: ${resolveChunksInText(t.description)}\nQuote: "${t.quote}"\nCitations:\n${citations.map((c: string) => `  - ${c}`).join('\n')}\nCross-document: ${t.isCrossDocument ? 'Yes' : 'No'}\nStatus: ${t.status || 'approved'}${depthBlock}`;
        }).join('\n\n');

        const serializePersonas = (personas: any[]) => personas.map(p =>
            `Persona: ${p.name} (${p.role})\nDemographics: ${p.demographics}\nBio: ${resolveChunksInText(p.bio)}\nJTBD: ${p.jtbd || 'N/A'}\nQuote: "${p.quote}"\nGoals: Life=${p.goals?.lifeGoal || 'N/A'} | Experience=${p.goals?.experienceGoal || 'N/A'} | Functional=${p.goals?.functionalGoal || 'N/A'}\n5Ws: Who=${resolveChunksInText(p.fiveWs?.who || 'N/A')} | What=${resolveChunksInText(p.fiveWs?.what || 'N/A')} | When/Where=${resolveChunksInText(p.fiveWs?.whenWhere || 'N/A')} | Why=${resolveChunksInText(p.fiveWs?.why || 'N/A')}\nPain Points: ${(Array.isArray(p.painPoints) ? p.painPoints : []).map((pp: any) => `${pp.label}: "${resolveChunksInText(pp.quote || '')}" (${resolveChunk(pp.sourceFile || pp.source || '')})`).join('; ')}\nMotivations: ${(Array.isArray(p.motivations) ? p.motivations : []).map((m: any) => `${m.label}: "${resolveChunksInText(m.quote || '')}" (${resolveChunk(m.source || '')})`).join('; ')}\nOpportunities: ${(Array.isArray(p.opportunities) ? p.opportunities : []).map((o: any) => `${o.label}: "${resolveChunksInText(o.quote || '')}" (${resolveChunk(o.source || '')})`).join('; ')}\nBehaviors: ${resolveChunksInText(p.behaviors || 'N/A')}\nTechnology Usage: ${resolveChunksInText(p.technologyUsage || 'N/A')}\nJourney Context: ${resolveChunksInText(p.journeyContext || 'N/A')}\nDay in the Life: ${resolveChunksInText(p.dayInTheLife || 'N/A')}\nBrand Relationships: ${resolveChunksInText(p.brandRelationships || 'N/A')}\nDecision Process: ${resolveChunksInText(p.decisionProcess || 'N/A')}\nConfidence: ${p.confidenceLevel || 'N/A'} (${p.evidenceCount || 0} evidence items)\nImage: ${p.imageUrl ? 'Available' : 'None'}`
        ).join('\n\n---\n\n');

        const serializeJourney = (stages: any[]) => stages.map((s, i) =>
            `Stage ${i+1}: ${s.phase}\nCustomer Action: ${resolveChunksInText(s.customerAction)}\nTouchpoint: ${s.touchpoint}\nFrontstage: ${resolveChunksInText(s.frontstageAction)}\nBackstage: ${resolveChunksInText(s.backstageAction)}\nSupport Processes: ${resolveChunksInText(s.supportProcesses)}\nPhysical Evidence: ${s.physicalEvidence}\nEmotion: ${s.emotion}${s.emotionIntensity ? ` (intensity ${s.emotionIntensity}/5)` : ''}\nPain Point: ${resolveChunksInText(s.painPoint)}\nFail Point: ${resolveChunksInText(s.fail_point || 'None identified')}\nMoment of Truth: ${s.momentOfTruth ? 'YES' : 'No'}\nTechnology Systems: ${resolveChunksInText(s.technologySystems || 'N/A')}\nActors: ${(s.actors || []).join(', ') || 'N/A'}\nOpportunity: ${resolveChunksInText(s.opportunityForImprovement || 'N/A')}`
        ).join('\n\n');

        const serializeRecommendations = (recs: any[]) => recs.map((r, i) =>
            `Recommendation ${i+1} [${r.impactLevel}]: ${r.title}\n${resolveChunksInText(r.description)}\nAction Items:\n${(r.actionItems || []).map((a: string, j: number) => `  ${j+1}. ${resolveChunksInText(a)}`).join('\n')}`
        ).join('\n\n');

        const serializePRD = (prd: any) => {
            const features = (prd.features || []).map((f: any) =>
                `[${f.priority}] ${f.name}: ${resolveChunksInText(f.description)}\n  User Stories: ${(f.userStories || []).join('; ')}\n  Acceptance Criteria: ${(f.acceptanceCriteria || []).join('; ')}\n  Citation: ${resolveChunksInText(f.citation || '')}`
            ).join('\n');
            return `Title: ${prd.title}\nObjective: ${resolveChunksInText(prd.purposeAndObjectives)}\nTarget Audience: ${prd.targetAudience}\nSuccess Metrics: ${(prd.successMetrics || []).join('; ')}\nFeatures:\n${features}\nRisks: ${(prd.risks || []).join('; ')}\nConstraints: ${(prd.constraints || []).join('; ')}`;
        };

        const serializeRoadmap = (rm: any) => {
            const items = (rm.items || []).map((i: any) =>
                `[${i.horizon}] ${i.initiative}: ${resolveChunksInText(i.description)} | Owner: ${i.owner || '?'} | Metric: ${i.successMetric || 'N/A'} | Theme: ${i.strategicTheme || 'N/A'} | Confidence: ${i.confidenceLevel || 'N/A'}`
            ).join('\n');
            return `Vision: ${rm.vision}\nGoals: ${(rm.goals || []).join('; ')}\nItems:\n${items}`;
        };

        const serializeGapAnalysis = (ga: any) => {
            const gaps = (ga.gaps || []).map((g: any) =>
                `[${g.severity}] ${g.capability}: Current ${g.currentMaturity}/5 → Target ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${resolveChunksInText(g.impact)}. Effort: ${g.effort}`
            ).join('\n');
            const risks = (ga.riskRegister || []).map((r: any) =>
                `Risk: ${resolveChunksInText(r.risk)} | Likelihood: ${r.likelihood} | Impact: ${r.impact} | Mitigation: ${resolveChunksInText(r.mitigation)}`
            ).join('\n');
            const actions = (ga.prioritizedActions || []).map((a: any) =>
                `[${a.priority}] ${resolveChunksInText(a.action)} | Timeline: ${a.timeline || 'N/A'} | Owner: ${a.owner || 'N/A'}`
            ).join('\n');
            return `Scope: ${ga.assessmentScope}\nGaps:\n${gaps}\nPrioritized Actions:\n${actions}\nQuick Wins: ${(ga.quickWins || []).map((q: any) => q.action).join('; ')}\nRisk Register:\n${risks}`;
        };

        const serializeTechAudit = (ta: any) => {
            const systems = (ta.systemsInventory || []).map((s: any) =>
                `${s.name} (${s.vendor}, ${s.status}): ${s.category} | Users: ${s.users} | Dept: ${s.department}`
            ).join('\n');
            const integrations = (ta.integrationMap || []).map((i: any) =>
                `${i.source} → ${i.target}: ${i.method} | Health: ${i.health} | Flow: ${resolveChunksInText(i.dataFlow)}`
            ).join('\n');
            const caps = (ta.capabilityMatrix || []).map((c: any) =>
                `${c.capability}: ${c.currentMaturity}/5 → ${c.targetMaturity}/5 (gap ${c.gap})`
            ).join('\n');
            return `Systems:\n${systems}\nIntegrations:\n${integrations}\nCapability Matrix:\n${caps}\nConsolidation: ${(ta.consolidationOpportunities || []).map((c: any) => `${c.title}: ${resolveChunksInText(c.description)}`).join('; ')}`;
        };

        const serializeCompetitive = (ca: any) => {
            const peers = (ca.peers || []).map((p: any) =>
                `${p.name}: ${resolveChunksInText(p.position)}\n  Strengths: ${(p.strengths || []).map((s: string) => resolveChunksInText(s)).join(', ')}\n  Weaknesses: ${(p.weaknesses || []).map((w: string) => resolveChunksInText(w)).join(', ')}\n  Differentiators: ${(p.differentiators || []).map((d: string) => resolveChunksInText(d)).join(', ')}`
            ).join('\n');
            const matrix = (ca.maturityMatrix || []).map((m: any) =>
                `${m.peer}: ${Object.entries(m.scores || {}).map(([k,v]) => `${k}=${v}`).join(', ')}`
            ).join('\n');
            const gaps = (ca.gapSummary || []).map((g: any) =>
                `${g.dimension}: Our ${g.ourScore} vs Best ${g.bestInClass} (gap ${g.gap}). Action: ${resolveChunksInText(g.action)}`
            ).join('\n');
            return `Context: ${resolveChunksInText(ca.industryContext)}\nPeers:\n${peers}\nMaturity Matrix:\n${matrix}\nGap Summary:\n${gaps}`;
        };

        const serializeTechArch = (ta: any) => {
            const sections = (ta.sections || []).map((s: any) => `${s.sectionNumber}. ${s.title}: ${resolveChunksInText(s.content)}`).join('\n');
            const nodes = (ta.nodes || []).map((n: any) => `${n.label} (${n.type}): ${resolveChunksInText(n.description)}`).join('\n');
            const flows = (ta.flows || []).map((f: any) => `${f.fromId} → ${f.toId}: ${resolveChunksInText(f.action)} [${f.protocol || ''}] (${f.status || 'active'})`).join('\n');
            return `Overview: ${resolveChunksInText(ta.overview)}\nSections:\n${sections}\nNodes:\n${nodes}\nFlows:\n${flows}`;
        };

        // Build source catalog from chunk map
        const sourceNames = new Set<string>();
        Object.values(chunkMap).forEach((info: any) => {
            if (info.sourceName) sourceNames.add(info.sourceName);
        });

        // Build EVIDENCE CATALOG from raw sources - the actual articles, posts, and data
        // This is what makes the report cite real intelligence instead of just deliverable abstracts
        // CRITICAL: The knowledge graph shows ~200 sources with full depth because it reads raw data.
        // The report MUST see the same depth. Inject liberally - Gemini 2.5 Flash has 1M token context.
        // 2026-06-15 (WS1.1 karpathy-second-brain-realignment): manifest-FIRST grounding. Prefer the
        // manifest chunk corpus (cite-by-pointer, the documented anti-RAG path); the rawSources
        // bulk-injection below now runs ONLY as the depth-safe fallback when the manifest yields
        // nothing (brand-new/untagged engagement). Mirrors assembleDeliverableCorpus's own contract.
        let evidenceCatalog = '';
        try {
            const _manifestCorpus = await this.assembleDeliverableCorpus('strategic-report', { tokenBudget: 40_000, minDistinctSources: 8 });
            if (_manifestCorpus && _manifestCorpus.trim().length > 0) evidenceCatalog = _manifestCorpus;
        } catch (e: any) { console.warn('[generateStrategicReport] manifest corpus failed, will try rawSources fallback:', e?.message || e); }
        if (!evidenceCatalog && rawSources && rawSources.length > 0) {
            const evidenceEntries: string[] = [];
            const tierLabels: Record<number, string> = { 1: 'TIER 1 (Academic/Gov)', 2: 'TIER 2 (Industry/News)', 3: 'TIER 3 (Community/Social)' };
            let totalArticlesInjected = 0;

            // Group by tier for structured evidence presentation
            for (const tier of [1, 2, 3]) {
                const tierSources = rawSources.filter((s: any) => (s.credibilityTier || 3) === tier && s.items?.length > 0);
                if (tierSources.length === 0) continue;

                // Content depth per tier: social posts short so full; academic needs abstracts
                const contentCap = tier === 3 ? 3000 : tier === 1 ? 2000 : 1500;

                evidenceEntries.push(`\n--- ${tierLabels[tier]} (${tierSources.length} sources, ${tierSources.reduce((s: number, src: any) => s + (src.items?.length || 0), 0)} total articles) ---`);
                for (const src of tierSources) {
                    evidenceEntries.push(`\nSOURCE: ${src.source || src.sourceId} (T${tier}, ${src.items.length} articles)`);
                    // INCLUDE ALL USER-CURATED ARTICLES - no hard caps.
                    // rawSources already filtered by excludedSources in App.tsx.
                    // Every item that reaches here was explicitly included by the user.
                    // Sort: priority items FIRST, then by relevance score.
                    const sortedItems = [...(src.items || [])].sort((a: any, b: any) => {
                        if (a.priority && !b.priority) return -1;
                        if (!a.priority && b.priority) return 1;
                        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
                    });
                    for (const item of sortedItems) {
                        const content = item.content ? item.content.substring(0, contentCap) : '';
                        const date = item.date ? ` | Date: ${item.date}` : '';
                        const url = item.url ? ` | URL: ${item.url}` : '';
                        const relevance = item.relevanceScore ? ` | Relevance: ${item.relevanceScore}/100` : '';
                        const author = item.author ? ` | Author: ${item.author}` : '';
                        evidenceEntries.push(`  ARTICLE: "${item.title}"${author}${date}${url}${relevance}\n  ${content}`);
                        if (item.priority) evidenceEntries.push(`  *** PRIORITY CITATION - User flagged this article for MANDATORY prominent placement in the report ***`);
                        totalArticlesInjected++;
                    }
                }
            }

            if (evidenceEntries.length > 0) {
                evidenceCatalog = `\n=== RAW INTELLIGENCE EVIDENCE (${totalArticlesInjected} articles injected from ${rawSources.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)} total collected across ${rawSources.length} sources) ===
THIS IS YOUR PRIMARY EVIDENCE BASE. The deliverables above are the AI's synthesis - but YOUR report must go DEEPER than the synthesis by citing the raw evidence directly.

MANDATORY EVIDENCE USAGE:
- CASE STUDIES: When an article describes a specific organization's experience, present it as a 2-3 sentence case study.
- VERBATIM SOCIAL EVIDENCE: Reddit posts, forum comments, and reviews are primary practitioner evidence. Quote them DIRECTLY with attribution: "One advancement director on Reddit wrote: '...'"
- ACADEMIC CITATIONS: Reference papers by title and author when available: "A 2024 OpenAlex study by Smith et al. found that..."
- DATA POINTS: Extract specific numbers, percentages, dates, dollar amounts from articles. "According to Industry Trade Press, enrollment dropped 15% at 23 institutions in Q1 2025."
- CONVERGENT EVIDENCE: When multiple sources agree, explicitly note convergence: "This finding is corroborated by three independent sources: [source1], [source2], and [source3]."
- COUNTER-EVIDENCE: When sources disagree, note the tension: "While [source1] reports growth, [source2] documented contraction in the same segment."
- SOURCE NAMES: ALWAYS cite the source by its publication/platform name, never as "research" or "studies" or "intelligence sources."

${evidenceEntries.join('\n')}
=== END RAW INTELLIGENCE EVIDENCE ===\n`;
            }
        }

        const sourceCatalog = sourceNames.size > 0
            ? `\n=== SOURCE CATALOG (${sourceNames.size} sources - cite by name) ===\n${Array.from(sourceNames).map(s => `- ${s}`).join('\n')}\n=== END SOURCE CATALOG ===\n`
            : '';

        // 2026-06-06 - MANIFEST -> WIKI RESOLUTION. Instead of trusting only
        // the in-memory context the caller threaded through, fetch each
        // deliverable from the wiki (engagements/<slug>/<kind>.json) and
        // prefer that as source of truth. Falls back to in-memory context
        // when the wiki copy is missing (e.g. the deliverable was generated
        // in this very session and hasn't been persisted yet). Replaces the
        // anti-pattern the user flagged 2026-06-06: in-memory state being
        // re-serialized into prompts instead of resolved from the wiki.
        const _resolverSlug = currentEngagementSlug();
        const _resolved = _resolverSlug
            ? await resolveDeliverableBodies(_resolverSlug, [
                'themes', 'personas', 'journey', 'recs', 'prd', 'roadmap',
                'gap', 'techAudit', 'competitive', 'techArch',
            ])
            : { engagementSlug: '', requestedKinds: [], pointers: {}, bodies: {}, elapsedMs: 0, readCount: 0, missingKinds: [] };
        const _wikiOrInMem = <T,>(wikiKey: string, wikiSubKey: string, inMem: T): T => {
            const w = (_resolved.bodies as any)[wikiKey];
            if (!w) return inMem;
            const sub = w[wikiSubKey];
            if (Array.isArray(sub) && sub.length) return sub as any;
            if (w && typeof w === 'object' && !Array.isArray(w) && wikiSubKey === '') return w as any;
            if (sub && typeof sub === 'object') return sub as any;
            return inMem;
        };
        const _themes = _wikiOrInMem('themes', 'themes', context.themes || []);
        const _personas = _wikiOrInMem('personas', 'personas', context.personas || []);
        const _journey = _wikiOrInMem('journey', 'stages', context.journeyStages || []);
        const _recs = _wikiOrInMem('recs', 'recommendations', context.recommendations || []);
        const _prd = (_resolved.bodies as any).prd || context.prd;
        const _roadmap = (_resolved.bodies as any).roadmap || context.roadmap;
        const _techArch = (_resolved.bodies as any).techArch || context.techArchitecture;
        const _gap = (_resolved.bodies as any).gap || context.gapAnalysis;
        const _techAudit = (_resolved.bodies as any).techAudit || context.techAudit;
        const _competitive = (_resolved.bodies as any).competitive || context.competitiveAnalysis;
        const _manifestBlock = manifestPointerBlock(_resolved);

        // Build the full deliverable context - wiki-first, in-memory fallback.
        // Each section header now declares its wiki pointer for audit.
        const deliverableContext: string[] = [];
        if (_themes?.length) deliverableContext.push(`=== THEMES (${_themes.length}) [pointer: ${_resolved.pointers.themes || '(in-memory)'}] ===\n${serializeThemes(_themes)}`);
        if (_personas?.length) deliverableContext.push(`=== PERSONAS (${_personas.length}) [pointer: ${_resolved.pointers.personas || '(in-memory)'}] ===\n${serializePersonas(_personas)}`);
        if (_journey?.length) deliverableContext.push(`=== SERVICE BLUEPRINT (${_journey.length} stages) [pointer: ${_resolved.pointers.journey || '(in-memory)'}] ===\n${serializeJourney(_journey)}`);
        if (_recs?.length) deliverableContext.push(`=== RECOMMENDATIONS (${_recs.length}) [pointer: ${_resolved.pointers.recs || '(in-memory)'}] ===\n${serializeRecommendations(_recs)}`);
        if (_prd) deliverableContext.push(`=== PRD [pointer: ${_resolved.pointers.prd || '(in-memory)'}] ===\n${serializePRD(_prd)}`);
        if (_roadmap) deliverableContext.push(`=== ROADMAP [pointer: ${_resolved.pointers.roadmap || '(in-memory)'}] ===\n${serializeRoadmap(_roadmap)}`);
        if (_techArch) deliverableContext.push(`=== TECH ARCHITECTURE [pointer: ${_resolved.pointers.techArch || '(in-memory)'}] ===\n${serializeTechArch(_techArch)}`);
        if (_gap) deliverableContext.push(`=== GAP ANALYSIS [pointer: ${_resolved.pointers.gap || '(in-memory)'}] ===\n${serializeGapAnalysis(_gap)}`);
        if (_techAudit) deliverableContext.push(`=== TECH ECOSYSTEM AUDIT [pointer: ${_resolved.pointers.techAudit || '(in-memory)'}] ===\n${serializeTechAudit(_techAudit)}`);
        if (_competitive) deliverableContext.push(`=== COMPETITIVE ANALYSIS [pointer: ${_resolved.pointers.competitive || '(in-memory)'}] ===\n${serializeCompetitive(_competitive)}`);
        if (_manifestBlock) deliverableContext.unshift(_manifestBlock);

        // Load wiki constraints for self-improvement
        let learnedConstraints = '';
        try {
            const { getActiveConstraints } = await import('./promptImprovementEngine');
            learnedConstraints = getActiveConstraints();
        } catch (e) { /* no constraints available */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: STRATEGIC REPORT WRITER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: STRATEGIC REPORT. You are a McKinsey-trained strategy consultant writing a comprehensive research report.

TASK: Synthesize ALL of the deliverable data below into a unified strategic whitepaper. The report must introduce and contextualize EVERY deliverable generated in this research - themes, personas, journey map, gap analysis, competitive positioning, technology audit, recommendations, PRD, roadmap, and architecture. Each deliverable gets its own section with deep evidence. This report will later be distilled into a strategy deck - so be thorough, evidence-rich, and citation-heavy. Write with unrestricted analytical depth.

RUMELT'S KERNEL (the report must contain all three):
1. DIAGNOSIS: ONE specific challenge grounded in evidence from multiple deliverables.
2. GUIDING POLICY: ONE strategic choice that excludes alternatives.
3. COHERENT ACTIONS: 5-7 actions that reinforce each other, drawn from recommendations and roadmap.

NARRATIVE STRUCTURE (McKinsey Whitepaper Format):
- Executive Summary: 500-800 words in SCR format. State the conclusion first. Reference at least 5 distinct intelligence sources.
- Each section: 400-800 words of analytical prose that reads like a published research report.
- WRITE LIKE A JOURNALIST: Name specific articles, quote specific people, cite specific data. "According to a February 2025 Industry Trade Press report..." not "according to research."
- USE CASE STUDIES: When an article describes a real institution, company, or person's experience, present it as a 2-3 sentence case study. "Amazon's January 2024 layoff of 16,000 corporate employees, reported across multiple Reddit communities, illustrates the volatility facing graduates..."
- CITE SOCIAL EVIDENCE: Reddit posts and community discussions are primary practitioner evidence. Quote them directly: "One practitioner on a community forum wrote: 'We waited three weeks for onboarding...', a sentiment echoed by dozens of similar posts in the dataset."
- WEAVE MULTIPLE SOURCES: Each paragraph should reference 2-3 different sources, showing convergent evidence. "Federal Register data confirms the regulatory shift, while a Hechinger Report investigation revealed the implementation gap at ground level."
- Every factual claim MUST cite its source by specific name (not "research shows" or "studies indicate").
- Include keyMetrics (label, value, context) with specific numbers from the evidence for EVERY section.
- Include keyQuote (text, attribution, source) with a VERBATIM quote from a named source for EVERY section.
- Leave evidenceGap as an empty string. Never write "EVIDENCE GAP", "Evidence Gap", "TBD", or any meta-annotation in user-facing fields - the report is a finished deliverable, not an annotated draft.

PRIORITY CITATION ENFORCEMENT:
Articles marked with "*** PRIORITY CITATION ***" in the evidence catalog below were explicitly flagged by the user for prominent placement. You MUST:
1. Cite EVERY priority-flagged article by name in the report
2. Include a direct quote or specific data point from each priority article
3. Place priority articles in the most relevant section - they should anchor the argument, not be footnotes
4. If a priority article doesn't fit any section naturally, create a "Notable Evidence" subsection

MANDATORY SECTION MANIFEST (generate EXACTLY these sections in this order - do NOT substitute strategy-document boilerplate like "Vision", "Governance Model", "Communication Plan"):
${(() => {
    const sections: string[] = [];
    let n = 1;
    sections.push(`${n++}. EXECUTIVE SUMMARY (sourceDeliverable: "executive_summary") - 500-800 words synthesizing the entire research body. Must reference at least 5 intelligence sources by name.`);
    if (context.themes?.length) {
        sections.push(`${n++}. RESEARCH LANDSCAPE: KEY THEMES (sourceDeliverable: "themes") - Present the ${context.themes.length} research themes as findings, each grounded in specific evidence. Name the articles and data that support each theme. This is NOT a strategy section - it's a research findings section.`);
        sections.push(`${n++}. THEME DEEP-DIVE: [Pick the highest-evidence theme] (sourceDeliverable: "themes") - 600+ words investigating the strongest theme in depth. Use case studies, quote articles, cite data. Show convergent evidence across multiple sources.`);
    }
    if (context.personas?.length) {
        for (const p of context.personas.slice(0, 4)) {
            sections.push(`${n++}. PERSONA: ${p.name} (sourceDeliverable: "personas") - Full persona profile as investigative narrative. Include JTBD, Cooper goals, pain points with quoted evidence, behaviors, technology usage, journey context, day-in-the-life. Write as if profiling a real person for a magazine article. Cite the specific sources that informed this persona.`);
        }
    }
    if (context.journeyStages?.length) {
        sections.push(`${n++}. SERVICE JOURNEY ANALYSIS (sourceDeliverable: "journey_map") - Walk through ALL ${context.journeyStages.length} journey stages. For each stage: what happens, what fails, what the emotional experience is, where the moments of truth are. Name specific pain points with evidence. Include frontstage/backstage actions.`);
        sections.push(`${n++}. MOMENTS OF TRUTH & FAILURE POINTS (sourceDeliverable: "journey_map") - Focus on the stages with fail_points and momentOfTruth=true. Describe what breaks, the consequences, and the evidence. Use specific data from the research.`);
    }
    if (context.gapAnalysis) {
        sections.push(`${n++}. CAPABILITY GAP ASSESSMENT (sourceDeliverable: "gap_analysis") - Present ALL gaps with current/target maturity scores. Include the risk register. Cite evidence for each gap's impact. Show the maturity progression path.`);
    }
    if (context.competitiveAnalysis) {
        sections.push(`${n++}. COMPETITIVE POSITIONING (sourceDeliverable: "competitive_analysis") - Present ALL peers with strengths/weaknesses/differentiators. Include the maturity matrix scores. Show where we lead and where we trail. Cite specific competitive intelligence.`);
    }
    if (context.techAudit) {
        sections.push(`${n++}. TECHNOLOGY ECOSYSTEM (sourceDeliverable: "tech_audit") - Present the systems inventory, integration map, and capability matrix. Name specific systems, vendors, health statuses. Identify consolidation opportunities with evidence.`);
    }
    if (context.recommendations?.length) {
        sections.push(`${n++}. STRATEGIC RECOMMENDATIONS (sourceDeliverable: "recommendations") - Present ALL ${context.recommendations.length} recommendations with full action items. Each recommendation must cite the evidence that justifies it. Group by impact level.`);
    }
    if (context.prd) {
        sections.push(`${n++}. PRODUCT REQUIREMENTS (sourceDeliverable: "prd") - Present key features with MoSCoW priority, user stories, and acceptance criteria. Tie each feature back to a persona need or gap finding.`);
    }
    if (context.roadmap) {
        sections.push(`${n++}. IMPLEMENTATION ROADMAP (sourceDeliverable: "roadmap") - Present ALL items across NOW/NEXT/LATER horizons with owners, success metrics, and dependencies. Each item must reference the recommendation or gap it addresses.`);
    }
    if (context.techArchitecture) {
        sections.push(`${n++}. ARCHITECTURE DIRECTION (sourceDeliverable: "tech_architecture") - Present the technical architecture with nodes, flows, and integration points. Tie to the tech audit findings and gap analysis.`);
    }
    sections.push(`${n++}. RISK ASSESSMENT & QUICK WINS (sourceDeliverable: "risk_assessment") - Top 5 risks from the gap analysis risk register + the top quick wins from the roadmap NOW horizon. Evidence-grounded, not generic.`);
    return sections.join('\n');
})()}

TOTAL: Generate ALL sections listed above. Do NOT skip any. Do NOT add sections not in this list (no "Vision and Mission", "Governance Model", "Communication Plan", "Change Management" - those are strategy document filler, not research report content).

ANTI-SLOP: No "paradigm shift", "game-changer", "leverage synergies", "in today's rapidly evolving landscape", or similar corporate filler. Write like a consultant who bills $500/hour - every word earns its place.

PLAIN TEXT ONLY: No **bold**, *italic*, or markdown. The rendering system handles formatting.

${learnedConstraints ? `\nLEARNED CONSTRAINTS (from prior user feedback):\n${learnedConstraints}\n` : ''}
${feedback ? `\nUSER FEEDBACK (PRIORITY):\n${feedback}\n` : ''}

=== DELIVERABLE DATA (use ALL of this) ===
${deliverableContext.join('\n\n')}
=== END DELIVERABLE DATA ===
${evidenceCatalog}
${sourceCatalog}
CRITICAL CITATION AND EVIDENCE REQUIREMENTS:
1. The RAW INTELLIGENCE EVIDENCE section above contains articles from ${rawSources?.length || 0} sources with ${rawSources?.reduce((s: number, r: any) => s + (r.items?.length || 0), 0) || 0} total collected items. THIS IS YOUR PRIMARY EVIDENCE BASE - the knowledge graph shows all this depth and YOUR REPORT MUST MATCH IT.
2. Your report MUST cite evidence from at LEAST 20 different named sources - not just the uploaded client documents. The knowledge graph connects ~200 evidence nodes; your report should reference a significant fraction of them.
3. CITE SPECIFIC ARTICLES BY NAME: "According to Industry Trade Press's article 'Universities Struggle with Skills Gap'..." or "A Reddit post in r/cscareerquestions noted that..."
4. QUOTE SPECIFIC DATA: Use specific statistics, dates, percentages, dollar amounts, and findings from the evidence articles. NEVER generalize what can be specified. BAD: "Research shows enrollment declined." GOOD: "Industry Trade Press reported a 15% enrollment decline across 23 public universities in Q1 2025, with rural institutions hit hardest at 22% [Industry Trade Press]."
5. USE CASE STUDY FORMAT: When an article describes a specific institution's experience, present it as a 2-4 sentence case study within the relevant section. MINIMUM 3 case studies across the report. Example: "CASE STUDY: Southern Oregon University received a $15M state lifeline in March 2025 to maintain operations after enrollment dropped below sustainability thresholds. The investment, paired with a workforce-aligned curriculum redesign, is projected to recover 60% of lost enrollment within 18 months [GDELT News]."
6. SOCIAL EVIDENCE IS PRIMARY EVIDENCE: Reddit posts, forum discussions, TrustPilot reviews, and community data are unfiltered practitioner voices. Quote them DIRECTLY and EXTENSIVELY: "A senior practitioner wrote on r/<community>: 'We've been doing the same thing for 20 years and wondering why our numbers keep slipping' - a sentiment echoed in 14 similar posts across the dataset."
7. The uploaded client documents provide ORGANIZATIONAL CONTEXT. The intelligence sources provide EXTERNAL EVIDENCE. Every section must weave BOTH: what the client's documents say about their situation + what the broader evidence reveals about the landscape they operate in.
8. Each section's "citations" array must list 5-10 ACTUAL source names (e.g., "Industry Trade Press", "OpenAlex", "Reddit: r/cscareerquestions", "Semantic Scholar: Smith 2024") - NEVER generic references like "intelligence_sources" or "CHUNK_XXX" or "research data."
9. EVERY section must include keyMetrics with 2-4 specific numbers drawn from the evidence (not approximations), and keyQuote with a VERBATIM quote from a named source.
10. If a section relies only on uploaded client documents with no external evidence, narrow the section's claims to what IS evidenced - do NOT pad. Never write "EVIDENCE GAP", "Evidence Gap", "TBD", or any meta-annotation in user-facing fields.
11. AIM FOR 400-800 WORDS PER SECTION. The report should feel like a published research paper, not a slide deck in paragraph form. Use analytical prose with evidence weaving, not bullet-point summaries.
12. CONVERGENT EVIDENCE: When 3+ sources agree on a finding, explicitly note the convergence. This is the strongest possible evidence and should be prominently featured.

Output JSON.`;

        const schema: any = {
            type: 'OBJECT',
            properties: {
                methodology: { type: 'STRING' },
                report: {
                    type: 'OBJECT',
                    properties: {
                        title: { type: 'STRING' },
                        date: { type: 'STRING' },
                        executiveSummary: { type: 'STRING' },
                        diagnosis: { type: 'STRING' },
                        guidingPolicy: { type: 'STRING' },
                        strategicPillars: { type: 'ARRAY', items: { type: 'STRING' } },
                        sections: { type: 'ARRAY', items: {
                            type: 'OBJECT',
                            properties: {
                                sectionNumber: { type: 'INTEGER' },
                                title: { type: 'STRING' },
                                content: { type: 'STRING' },
                                sourceDeliverable: { type: 'STRING' },
                                citations: { type: 'ARRAY', items: { type: 'STRING' } },
                                keyMetrics: { type: 'ARRAY', items: {
                                    type: 'OBJECT',
                                    properties: { label: { type: 'STRING' }, value: { type: 'STRING' }, context: { type: 'STRING' } },
                                    required: ['label', 'value']
                                }},
                                keyQuote: { type: 'OBJECT', properties: {
                                    text: { type: 'STRING' }, attribution: { type: 'STRING' }, source: { type: 'STRING' }
                                }},
                                evidenceGap: { type: 'STRING' },
                            },
                            required: ['sectionNumber', 'title', 'content', 'sourceDeliverable', 'citations']
                        }},
                    },
                    required: ['title', 'executiveSummary', 'diagnosis', 'guidingPolicy', 'strategicPillars', 'sections']
                }
            },
            required: ['methodology', 'report']
        };

        // ───────────────────────────────────────────────────────────────────
        // 2026-05-31 (Phase B) - FAN-OUT-FIRST architecture. The old design did
        // the WHOLE report in ONE chat-session call (executeStep), which has no
        // maxOutputTokens and a 20KB repetition-guard that CLIPPED long reports
        // -> thin output. New design:
        //   1. A small FRAMEWORK call (title, exec summary, diagnosis, guiding
        //      policy, pillars, landscape framing) - bounded, won't truncate.
        //   2. EVERY content section is generated by its OWN standalone call
        //      (high token budget, no chat-session guard), with a per-section
        //      word-count depth floor + one EXPAND retry.
        // This is what makes the brief deep + frames the space.
        // ───────────────────────────────────────────────────────────────────
        const frameworkSchema: any = {
            type: 'OBJECT',
            properties: {
                methodology: { type: 'STRING' },
                title: { type: 'STRING' },
                executiveSummary: { type: 'STRING' },
                diagnosis: { type: 'STRING' },
                guidingPolicy: { type: 'STRING' },
                strategicPillars: { type: 'ARRAY', items: { type: 'STRING' } },
                landscapeFraming: {
                    type: 'OBJECT',
                    properties: {
                        space: { type: 'STRING' },
                        opportunities: { type: 'ARRAY', items: { type: 'STRING' } },
                        challenges: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                },
            },
            required: ['title', 'executiveSummary', 'diagnosis', 'guidingPolicy', 'strategicPillars'],
        };

        const frameworkPrompt = `${prompt}

*** THIS CALL PRODUCES ONLY THE FRAMEWORK OBJECT (no section array). ***
Generate: methodology; title; executiveSummary (500-800 words, SCR, names >=5 sources); diagnosis;
guidingPolicy; strategicPillars (5-7); landscapeFraming { space, opportunities[4-6], challenges[4-6] }.
FRAME THE SPACE in landscapeFraming.space (150-250 words): where this domain is right now, the forces
shaping it, and where it is heading. The detailed sections are written separately, so do your best
synthesis work HERE on the framing and the kernel.`;

        onStream('Phase 1: Framing the space (diagnosis, landscape, pillars, summary)...');
        let framework: any = {};
        try {
            framework = await this.executeStep<any>(frameworkPrompt, frameworkSchema, [], onStream, /* groundedViaManifest */ true);
        } catch (e) {
            console.warn('[StrategicReport] framework call failed:', e);
        }
        const diagnosis = framework?.diagnosis || '';
        const guidingPolicy = framework?.guidingPolicy || '';
        const strategicPillars = framework?.strategicPillars || [];
        const landscapeFraming = framework?.landscapeFraming || null;

        // Build the COMPLETE ordered section manifest - EVERY section fans out.
        const manifest: { title: string; sourceDeliverable: string; data: string; guidance?: string }[] = [];
        // FRAME THE SPACE leads the body (the "frame the space" requirement).
        manifest.push({
            title: 'FRAMING THE SPACE',
            sourceDeliverable: 'landscape',
            data: `Space: ${landscapeFraming?.space || ''}\nOpportunities: ${(landscapeFraming?.opportunities || []).join('; ')}\nChallenges: ${(landscapeFraming?.challenges || []).join('; ')}`,
            guidance: 'Expand into 400-600 words: where the field is now, the forces shaping it, where it is heading, and the biggest opportunities and challenges. This sets up the entire report, make it a real landscape framing, not a summary.',
        });
        if (context.themes?.length) {
            manifest.push({ title: 'RESEARCH LANDSCAPE: KEY THEMES', sourceDeliverable: 'themes', data: serializeThemes(context.themes), guidance: `Present ALL ${context.themes.length} themes as evidenced findings. Name the articles/data behind each. Research-findings section, not strategy.` });
            manifest.push({ title: 'THEME DEEP-DIVE', sourceDeliverable: 'themes_deepdive', data: serializeThemes(context.themes.slice(0, 5)), guidance: 'Investigate the 2-3 highest-evidence themes in depth, with case studies, quoted articles, and convergent evidence across multiple sources.' });
        }
        if (context.personas?.length) {
            for (const p of context.personas.slice(0, 4)) {
                manifest.push({ title: `PERSONA: ${p.name}`, sourceDeliverable: 'personas', data: serializePersonas([p]), guidance: 'Write as an investigative profile: tell this persona story with quoted evidence, JTBD, pains, behaviors.' });
            }
        }
        if (context.journeyStages?.length) {
            manifest.push({ title: 'SERVICE JOURNEY ANALYSIS', sourceDeliverable: 'journey_map', data: serializeJourney(context.journeyStages), guidance: 'Walk through every stage: what happens, what fails, the emotional experience, moments of truth.' });
            manifest.push({ title: 'MOMENTS OF TRUTH AND FAILURE POINTS', sourceDeliverable: 'journey_moments', data: serializeJourney(context.journeyStages), guidance: 'Focus on fail points + moments of truth: what breaks, the consequence, the evidence.' });
        }
        if (context.gapAnalysis) manifest.push({ title: 'CAPABILITY GAP ASSESSMENT', sourceDeliverable: 'gap_analysis', data: serializeGapAnalysis(context.gapAnalysis), guidance: 'Present all gaps with maturity scores + the risk register; cite evidence for each gap impact.' });
        if (context.competitiveAnalysis) manifest.push({ title: 'COMPETITIVE POSITIONING', sourceDeliverable: 'competitive_analysis', data: serializeCompetitive(context.competitiveAnalysis), guidance: 'Present all peers with strengths/weaknesses/differentiators + the maturity matrix; where we lead and trail.' });
        if (context.techAudit) manifest.push({ title: 'TECHNOLOGY ECOSYSTEM', sourceDeliverable: 'tech_audit', data: serializeTechAudit(context.techAudit), guidance: 'Present systems inventory, integration map, capability matrix; name systems/vendors; consolidation opportunities.' });
        if (context.recommendations?.length) manifest.push({ title: 'STRATEGIC RECOMMENDATIONS', sourceDeliverable: 'recommendations', data: serializeRecommendations(context.recommendations), guidance: 'Present all recommendations with action items; each must cite the evidence that justifies it.' });
        if (context.prd) manifest.push({ title: 'PRODUCT REQUIREMENTS', sourceDeliverable: 'prd', data: serializePRD(context.prd), guidance: 'Key features with MoSCoW priority, user stories, acceptance criteria; tie each to a persona need or gap.' });
        if (context.roadmap) manifest.push({ title: 'IMPLEMENTATION ROADMAP', sourceDeliverable: 'roadmap', data: serializeRoadmap(context.roadmap), guidance: 'All items across NOW/NEXT/LATER with owners, success metrics, dependencies; reference the rec/gap each addresses.' });
        if (context.techArchitecture) manifest.push({ title: 'ARCHITECTURE DIRECTION', sourceDeliverable: 'tech_architecture', data: serializeTechArch(context.techArchitecture), guidance: 'Architecture with nodes, flows, integration points; tie to the tech audit + gap analysis.' });
        manifest.push({
            title: 'RISK ASSESSMENT AND QUICK WINS',
            sourceDeliverable: 'risk_assessment',
            data: `${context.gapAnalysis ? serializeGapAnalysis(context.gapAnalysis) : ''}\n${context.roadmap ? serializeRoadmap(context.roadmap) : ''}`.trim() || 'Derive from the themes, journey pains, and recommendations above.',
            guidance: 'Top 5 risks (with likelihood/impact/mitigation) + top quick wins. Evidence-grounded, not generic.',
        });

        const sectionSchema: any = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                content: { type: 'STRING' },
                citations: { type: 'ARRAY', items: { type: 'STRING' } },
                keyMetrics: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, value: { type: 'STRING' }, context: { type: 'STRING' } }, required: ['label', 'value'] } },
                keyQuote: { type: 'OBJECT', properties: { text: { type: 'STRING' }, attribution: { type: 'STRING' }, source: { type: 'STRING' } } },
                evidenceGap: { type: 'STRING' },
            },
            required: ['title', 'content', 'citations']
        };

        const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const WORD_FLOOR = 250;
        const evCat = evidenceCatalog ? 'EVIDENCE CATALOG (cite from this):\n' + evidenceCatalog.substring(0, 30000) : '';
        const noAnnotationRule = 'No QA-style placeholder markers or notes about missing data; leave the evidenceGap field as an empty string.';

        const writeSection = async (m: { title: string; sourceDeliverable: string; data: string; guidance?: string }): Promise<any | null> => {
            const mkPrompt = (expand: boolean) => `You are a McKinsey-trained strategy consultant writing ONE section of a strategic research report.

REPORT FRAMEWORK (for coherence):
DIAGNOSIS: ${diagnosis}
GUIDING POLICY: ${guidingPolicy}
PILLARS: ${strategicPillars.join('; ')}

WRITE SECTION: "${m.title}" (sourceDeliverable: "${m.sourceDeliverable}").
${m.guidance || ''}

REQUIREMENTS:
1. 400-800 words of analytical prose, NOT bullet points, NOT a summary.
2. Lead with EXTERNAL research evidence (name the article/source + quote it), corroborate with a 2nd source, THEN contextualize with client docs.
3. keyMetrics: 2-4 specifics, each carried INSIDE a cited quote/context (never a naked number as your own assertion).
4. keyQuote: one VERBATIM quote from a named source.
5. citations: 5-10 REAL source names (never "research"/"studies"/internal synthesis passes).
6. No markdown. ${noAnnotationRule}
${expand ? '\nYOUR PREVIOUS DRAFT WAS TOO THIN. EXPAND with more evidence, a case study, and convergent sources. Do NOT summarize, do NOT repeat, add substance.' : ''}

DELIVERABLE DATA:
${m.data}

${evCat}

Output JSON matching the section schema.`;
            let best: any = null; let bestWords = -1;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const resp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-3.5-flash',
                        contents: { parts: [{ text: mkPrompt(attempt > 0) }] },
                        config: { responseMimeType: 'application/json', responseSchema: sectionSchema, temperature: 0.35, maxOutputTokens: 8192 } as any
                    }), 3, 3000, `Report Section: ${m.title}`);
                    const parsed = JSON.parse(tryRepairJson(resp.text || '{}'));
                    const words = String(parsed?.content || '').split(/\s+/).filter(Boolean).length;
                    if (words > bestWords) { best = parsed; bestWords = words; }
                    if (words >= WORD_FLOOR) break;
                    console.warn(`[StrategicReport] section "${m.title}" thin (${words}w) - ${attempt === 0 ? 'expanding' : 'kept best'}`);
                } catch (e) {
                    console.warn(`[StrategicReport] section "${m.title}" attempt ${attempt + 1} failed:`, e);
                }
            }
            return best;
        };

        // Fan out in small concurrent batches (cut wall-clock; avoid rate-limit storms).
        onStream(`Phase 2: Writing ${manifest.length} sections (deep, evidence-rich)...`);
        const sections: any[] = [];
        const BATCH = 4;
        for (let i = 0; i < manifest.length; i += BATCH) {
            const batch = manifest.slice(i, i + BATCH);
            const results = await Promise.all(batch.map(m => writeSection(m).then(s => ({ m, s }))));
            for (const { m, s } of results) {
                if (s && s.content) {
                    s.sourceDeliverable = m.sourceDeliverable;
                    sections.push(s);
                }
            }
            onStream(`Sections written: ${sections.length}/${manifest.length}`);
        }
        sections.forEach((s, idx) => { s.sectionNumber = idx + 1; });

        const report: any = {
            title: framework?.title || 'Strategic Report',
            date: new Date().toISOString().slice(0, 10),
            executiveSummary: framework?.executiveSummary || '',
            diagnosis,
            guidingPolicy,
            strategicPillars,
            landscapeFraming,
            sections,
        };
        onStream(`Strategic Report complete: ${sections.length} sections generated.`);
        return { methodology: framework?.methodology || '', report };
    }

    async visualizeNarrative(narrativeData: StepResult_Narrative, context: DeckInputContext, outputs: OutputOption[], onStatus: (s: string) => void, onStream?: (t: string) => void): Promise<StepResult_Final> {
        let slidesWithImages: Slide[] = [];
        if (outputs.includes('STRATEGY_DECK')) {
            // --- POST-PROCESSOR: Validate and fix slides ---
            onStatus("Validating Strategy Deck (Post-Processing)...");
            const { postProcessSlides } = await import('./slidePostProcessor');
            const { getChunkSourceMap } = await import('./researchFabricOrchestrator');
            const chunkSourceMap = getChunkSourceMap();
            const { slides: processedSlides, issues, issueCount, autoCorrectedCount } = postProcessSlides(narrativeData.slides || [], undefined, chunkSourceMap);
            if (issueCount > 0) {
                console.log(`[SlidePostProcessor] ${issueCount} issues found, ${autoCorrectedCount} auto-corrected:`);
                issues.forEach(issue => console.log(`  Slide ${issue.slideNumber} [${issue.severity}] ${issue.type}: ${issue.detail}`));
            }

            // D5/A13: Auto-correct slop violations on all slide text fields
            const { detectBannedPhrases, getSlopReplacement } = await import('./wikiService');
            let totalSlopFixes = 0;
            for (const slide of processedSlides) {
                const fields: (keyof typeof slide)[] = ['title', 'narrative', 'speakerNotes', 'quote'];
                for (const field of fields) {
                    if (typeof slide[field] === 'string' && slide[field]) {
                        const violations = detectBannedPhrases(slide[field] as string);
                        if (violations.length > 0) {
                            let text = slide[field] as string;
                            for (const v of violations) {
                                const replacement = getSlopReplacement(v.phrase);
                                text = text.replace(new RegExp(v.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement === 'Remove' ? '' : '');
                                totalSlopFixes++;
                            }
                            (slide as any)[field] = text.replace(/\s{2,}/g, ' ').trim();
                        }
                    }
                }
                // Also clean content array
                if (slide.content) {
                    slide.content = slide.content.map(c => {
                        const violations = detectBannedPhrases(c);
                        if (violations.length === 0) return c;
                        let text = c;
                        for (const v of violations) {
                            text = text.replace(new RegExp(v.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
                            totalSlopFixes++;
                        }
                        return text.replace(/\s{2,}/g, ' ').trim();
                    }).filter(c => c.length > 0);
                }
            }
            if (totalSlopFixes > 0) {
                console.log(`[SlopCorrection] Auto-corrected ${totalSlopFixes} slop violations across slides`);
            }

            // --- LAYOUT RESOLVER: Auto-fix empty data panels ---
            // If a slide is CONTENT_DATA_PANEL but has no metrics, or BENTO_GRID with no cells,
            // try to extract metrics from content text and re-resolve the layout.
            try {
                const { resolveLayout } = await import('./layoutResolver');
                for (const slide of processedSlides) {
                    const layout = slide.layout;
                    const hasEmptyMetrics = (layout === 'CONTENT_DATA_PANEL' || layout === 'CONTENT_INSIGHT_CHART') && (!slide.metrics || slide.metrics.length === 0);
                    const hasEmptyBento = layout === 'BENTO_GRID' && (!slide.bentoCells || slide.bentoCells.length === 0);
                    const hasEmptySolution = layout === 'PROBLEM_SOLUTION' && (!slide.problemStat && (!slide.solutionPoints || slide.solutionPoints.length === 0));

                    if (hasEmptyMetrics || hasEmptyBento || hasEmptySolution) {
                        // Build content blocks from what we have
                        const blocks: any[] = [];
                        if (slide.content?.length) {
                            blocks.push({ type: 'evidence_bullets', items: slide.content.map((c: string) => ({ text: c })) });
                        }
                        if (slide.quote) {
                            blocks.push({ type: 'quote_block', text: slide.quote, attribution: slide.personaName || '' });
                        }
                        if (blocks.length > 0) {
                            const isDark = (layout as string) === 'BENTO_GRID' || (layout as string) === 'SECTION_HEADER';
                            const { layout: newLayout, mappedFields } = resolveLayout(blocks, isDark ? 'dark' : 'light');
                            // Only apply if the resolver found a better match
                            if (newLayout !== layout) {
                                console.log(`[LayoutResolver] Slide ${slide.slideNumber}: ${layout} (empty fields) → ${newLayout}`);
                                (slide as any).layout = newLayout;
                            }
                            // Fill in any missing fields from the resolver
                            if (mappedFields.metrics && !slide.metrics?.length) slide.metrics = mappedFields.metrics;
                            if (mappedFields.bentoCells && !slide.bentoCells?.length) slide.bentoCells = mappedFields.bentoCells;
                        }
                    }
                }
            } catch (e) {
                console.warn('[LayoutResolver] Skipped:', e);
            }

            // Inject persona images into slides that reference a persona by name.
            // This is the ONE case where a generated image appears on a slide.
            onStatus("Assembling Slide Data Panels...");
            for (let i = 0; i < processedSlides.length; i++) {
                 const slide = { ...processedSlides[i], imageUrl: undefined as string | undefined, imageStatus: 'idle' as const };
                 if (slide.personaName && context.personas) {
                     const matchedPersona = context.personas.find(p =>
                         p.name === slide.personaName ||
                         p.name.toLowerCase().includes((slide.personaName || '').toLowerCase()) ||
                         (slide.personaName || '').toLowerCase().includes(p.name.toLowerCase())
                     );
                     if (matchedPersona?.imageUrl) {
                         slide.personaImageUrl = matchedPersona.imageUrl;
                     }
                     if (matchedPersona && !slide.personaRole) {
                         slide.personaRole = matchedPersona.role;
                     }
                 }
                 slidesWithImages.push(slide);
            }
        }

        return { methodology: narrativeData.methodology, videoScript: [], slides: slidesWithImages, recommendations: context.recommendations || [] };
    }

    /**
     * Claude-backed synthesis fallback. Used when Gemini Flash repetition-
     * collapses on long structured JSON (filenames, port numbers, dollar
     * figures - any repeated token can trigger the attractor loop that the
     * RepetitionGuard catches). Claude Opus 4.7 does not have this failure
     * mode.
     *
     * Context reconstitution: Gemini's chatSession carries the ingested
     * corpus + prior stage results in its stateful history. Claude is
     * stateless, so we pass the cached systemInstruction + all accumulated
     * updateContext() payloads (themes/personas/etc.) as the system prompt.
     * The step's own prompt becomes the user message. Schema is described
     * in-prompt since Claude's messages API doesn't accept Gemini-style
     * responseSchema.
     */
    /**
     * Gemini-first, Claude-fallback step runner. Use this for synthesis
     * steps (themes/personas/recs/gap/blueprint) that repetition-collapse
     * on Gemini Flash. If Gemini succeeds, behavior is identical to
     * executeStep. If RepetitionGuard fires, transparently retries via
     * Claude Opus 4.7 with accumulated context from prior stages.
     */
    private async executeStepResilient<T>(
        prompt: string,
        schema: Schema,
        parts: any[],
        onStream: (t: string) => void,
        stepLabel: string,
        groundedViaManifest = false,
    ): Promise<T> {
        // 2026-06-05 (Meta-Harness M1) - Trace recorder intercept. Every outer
        // synthesis call records ONE TraceTurn carrying the composed prompt,
        // model id, full response, fallback chain (if any), and elapsed time.
        // Step 7's epoch proposer reads these traces via /api/sessions/{slug}/traces.
        // Inner network retries inside executeStep are NOT separately recorded
        // (they re-run with the same prompt on the same provider); a fallback
        // to a different MODEL (RepetitionCollapse -> GPT-5.5) IS recorded as
        // fallback_chain. Recording is off the hot path and never throws.
        const _trace_started_at = Date.now();
        let _trace_model_id = 'gemini-3.1-pro-preview';
        try {
            const result = await this.executeStep<T>(prompt, schema, parts, onStream, groundedViaManifest);
            try {
                const { recordTurn } = await import('./traceRecorder');
                recordTurn({
                    step_label: stepLabel,
                    model_id: _trace_model_id,
                    prompt,
                    response: (() => { try { return JSON.stringify(result, null, 2); } catch { return '[unserializable result]'; } })(),
                    started_at: _trace_started_at,
                });
            } catch { /* non-fatal */ }
            return result;
        } catch (err: any) {
            if (err?.code === 'RepetitionCollapse') {
                // 2026-05-03 - Repetition-collapse fallback retargeted from
                // Claude Opus to GPT-5.5. Same recovery semantics, no Anthropic
                // dependency. The Claude path is preserved (executeStepViaClaude
                // below) so users on flagship engagements can opt back in via
                // a future flag, but the default cascade is now Gemini → GPT.
                console.warn(`[${stepLabel}] Gemini repetition-collapsed on "${err.sample}" (×${err.occurrences}). Falling back to GPT-5.5.`);
                const fallback_chain = [_trace_model_id, 'gpt-5.5'];
                _trace_model_id = 'gpt-5.5';
                try {
                    const result = await this.executeStepViaGPT<T>(prompt, schema, onStream, stepLabel, groundedViaManifest);
                    try {
                        const { recordTurn } = await import('./traceRecorder');
                        recordTurn({
                            step_label: stepLabel,
                            model_id: _trace_model_id,
                            prompt,
                            response: (() => { try { return JSON.stringify(result, null, 2); } catch { return '[unserializable result]'; } })(),
                            started_at: _trace_started_at,
                            fallback_chain,
                            fallback_fired: true,
                            note: `RepetitionCollapse on Gemini, recovered via GPT-5.5`,
                        });
                    } catch { /* non-fatal */ }
                    return result;
                } catch (err2: any) {
                    try {
                        const { recordTurn } = await import('./traceRecorder');
                        recordTurn({
                            step_label: stepLabel,
                            model_id: _trace_model_id,
                            prompt,
                            response: '',
                            started_at: _trace_started_at,
                            fallback_chain,
                            fallback_fired: true,
                            failed: true,
                            error: err2?.message || String(err2),
                            note: `RepetitionCollapse + GPT fallback both failed`,
                        });
                    } catch { /* non-fatal */ }
                    throw err2;
                }
            }
            try {
                const { recordTurn } = await import('./traceRecorder');
                recordTurn({
                    step_label: stepLabel,
                    model_id: _trace_model_id,
                    prompt,
                    response: '',
                    started_at: _trace_started_at,
                    failed: true,
                    error: err?.message || String(err),
                });
            } catch { /* non-fatal */ }
            throw err;
        }
    }

    private async executeStepViaGPT<T>(prompt: string, schema: Schema, onStream: (t: string) => void, stepLabel: string = 'synthesis', groundedViaManifest = false): Promise<T> {
        const { analyzeTextJSON } = await import('./openaiService');

        const contextBlock = this.accumulatedContext.length > 0
            ? '\n\n=== ACCUMULATED CONTEXT FROM PRIOR STAGES ===\n' +
              this.accumulatedContext.map(c => `--- ${c.label} ---\n${c.payload}`).join('\n\n') +
              '\n=== END ACCUMULATED CONTEXT ===\n'
            : '';

        // 2026-06-16 - DE-RAG: mirror executeStep. When the caller grounded via the
        // manifest, suppress the parallel embedding-RAG injection on the GPT fallback
        // path too, so a Gemini->GPT repetition-collapse fallback does not silently
        // re-introduce the hybrid hollow-deliverable injection the manifest replaced.
        let goalEvidenceBlock = '';
        let substrateBlock = '';
        if (!groundedViaManifest) {
            try {
                goalEvidenceBlock = await this.getGoalEvidenceBlock();
            } catch (e: any) {
                console.warn('[executeStepViaGPT] goal-evidence retrieval skipped:', e?.message || e);
            }
            // 2026-06-05 (Step 5, volume-to-insight) - substrate (multi-angle coverage) block.
            try {
                substrateBlock = await this.getSubstrateEvidenceBlock();
            } catch (e: any) {
                console.warn('[executeStepViaGPT] substrate retrieval skipped:', e?.message || e);
            }
        }
        const effectivePrompt = [this.buildObjectiveAnchor(), goalEvidenceBlock, substrateBlock, prompt]
            .filter(s => s && s.length > 0)
            .join('\n');

        const schemaDescription = `\n\nOUTPUT A SINGLE JSON OBJECT MATCHING THIS SHAPE:\n${JSON.stringify(schema, null, 2)}\n\nReturn ONLY the JSON object, no markdown fences, no preamble, no trailing prose.`;

        const systemPromptForGPT = this.systemInstructionCached + contextBlock;
        const userPromptForGPT = effectivePrompt + schemaDescription;

        onStream(`[${stepLabel}] Gemini repetition-collapsed. Retrying via GPT-5.5...`);
        console.warn(`[GPT Fallback] ${stepLabel}: routing to gpt-5.5 (system=${Math.round(systemPromptForGPT.length / 1024)}KB, user=${Math.round(userPromptForGPT.length / 1024)}KB)`);

        const result = await analyzeTextJSON<T>(
            systemPromptForGPT,
            userPromptForGPT,
            'gpt-5.5',
            32_000,
            0.2,
        );
        try {
            const { stripQAAnnotationsDeep } = await import('./slidePostProcessor');
            return stripQAAnnotationsDeep(result);
        } catch (e) { /* non-blocking */ }
        return result;
    }

    // 2026-05-03 - executeStepViaClaude removed on this branch
    // (HiC-Gemini-Primary). The repetition-collapse fallback now lives in
    // executeStepViaGPT (above), and Anthropic is no longer reachable from
    // the synthesis pipeline on any code path.

    /**
     * 2026-05-30 - RESEARCH-OBJECTIVE SUPREMACY anchor. Prepended to EVERY
     * synthesis prompt (themes breadth pass, Gemini step, GPT fallback) so the
     * current objective is the sole filter and prior-engagement memory, cached
     * portfolio data, or off-topic uploaded documents can never substitute a
     * different topic. Empty string when no goal is set. Central guard against
     * the co-op contamination of unrelated objectives.
     */
    private buildObjectiveAnchor(): string {
        const g = (this.goal || '').trim();
        if (!g) return '';
        return `\n=== RESEARCH OBJECTIVE (SUPREME FILTER) ===\n` +
            `Every theme, finding, persona, metric, and recommendation you produce MUST directly serve THIS objective:\n"${g}"\n` +
            `Context from prior engagements, cross-session memory, or uploaded documents is BACKGROUND ONLY. If any evidence (including an uploaded client document) is about a different subject than this objective, DO NOT promote it into a theme, finding, or deliverable. Stay strictly on-objective; never substitute a prior engagement's topic for this one.\n` +
            `=== END OBJECTIVE ===\n`;
    }

    private async executeStep<T>(prompt: string, schema: Schema, parts: any[] = [], onStream: (t: string) => void, groundedViaManifest = false): Promise<T> {
        // 2026-06-16 - DE-RAG (anti-RAG convergence). When the caller already
        // grounded this prompt through the MANIFEST (assembleDeliverableCorpus),
        // the two embedding-RAG blocks below are redundant PARALLEL injection -
        // the documented hollow-deliverable root cause (manifest corpus + 120-chunk
        // fetch-articles pack + 18-article substrate pack all in one prompt). When
        // groundedViaManifest is set we suppress them; the manifest IS the grounding.
        // They remain the legacy FALLBACK for ungrounded steps (manifest empty, or
        // non-deliverable steps that pass false). Bounded + reversible: default
        // (false) preserves prior behavior exactly.
        // 2026-05-19 - NotebookLM-style goal-evidence injection.
        let goalEvidenceBlock = '';
        let substrateBlock = '';
        if (!groundedViaManifest) {
            try {
                goalEvidenceBlock = await this.getGoalEvidenceBlock();
            } catch (e: any) {
                console.warn('[executeStep] goal-evidence retrieval skipped:', e?.message || e);
            }
            // 2026-06-05 (Step 5, volume-to-insight) - substrate (multi-angle coverage) block.
            try {
                substrateBlock = await this.getSubstrateEvidenceBlock();
            } catch (e: any) {
                console.warn('[executeStep] substrate retrieval skipped:', e?.message || e);
            }
        } else {
            console.log('[executeStep] manifest-grounded step: embedding-RAG (goal+substrate) injection suppressed (de-RAG 2026-06-16)');
        }
        // 2026-05-23 - Karpathy Phase 2.3: Prepend recurring-shortfall topics
        // from cross-engagement memory. Topics that 2+ prior engagements have
        // hit as shortfalls get explicitly named in every generation prompt so
        // the model prioritizes evidence on them this session.
        let recurringShortfallBlock = '';
        try {
            const { getRecurringShortfallPreamble } = await import('./wikiService');
            // 2026-05-30 - Pass the current objective so cross-engagement
            // shortfalls are relevance-gated, not blanket-injected.
            recurringShortfallBlock = getRecurringShortfallPreamble((this as any).goal);
        } catch { /* best-effort */ }

        // 2026-05-30 - RESEARCH-OBJECTIVE SUPREMACY anchor, prepended to EVERY
        // synthesis step (themes, personas, narrative, recommendations...).
        // The objective is the sole filter: prior-engagement memory, cached
        // portfolio data, and off-topic uploaded documents are background only
        // and must never become themes/findings. Central guard against the
        // co-op contamination of unrelated objectives (AI-design run that
        // produced a co-op journey because a single co-op upload + co-op
        // engagement memory dominated synthesis).
        const objectiveAnchor = this.buildObjectiveAnchor();

        const effectivePrompt = [objectiveAnchor, recurringShortfallBlock, goalEvidenceBlock, substrateBlock, prompt]
            .filter(s => s && s.length > 0)
            .join('\n');

        // Retry the entire step (including streaming) to handle mid-stream network failures
        // like ERR_NETWORK_CHANGED, which kill the stream after sendMessageStream succeeds
        const MAX_STEP_RETRIES = 5;
        let lastError: any;

        for (let attempt = 0; attempt < MAX_STEP_RETRIES; attempt++) {
            try {
                const result = await withRetry<any>(() => this.chatSession.sendMessageStream({
                    message: [...parts, { text: effectivePrompt }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                }), 3, 3000, "GenAI Step Execution");

                let fullText = "";
                const stream = (result.stream || result) as AsyncIterable<GenerateContentResponse>;
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text;
                        if (text) {
                            fullText += text;
                            onStream(fullText);

                            // REPETITION GUARD: If the output is growing large (>20KB) and
                            // a 50-char phrase repeats 5+ times, the model is looping.
                            // Truncate to the content before the repetition started.
                            if (fullText.length > 20000 && fullText.length % 5000 < 200) {
                                // Sample a 50-char window from the last 200 chars
                                const tail = fullText.slice(-200).replace(/[{}\[\]",:]/g, '').trim();
                                if (tail.length >= 50) {
                                    const sample = tail.substring(0, 50);
                                    const occurrences = fullText.split(sample).length - 1;
                                    if (occurrences >= 5) {
                                        console.warn(`[RepetitionGuard] Detected "${sample.substring(0, 30)}..." repeated ${occurrences}x. Truncating at ${fullText.length} chars.`);
                                        // Find the first occurrence and keep everything up to the 2nd occurrence
                                        const firstIdx = fullText.indexOf(sample);
                                        const secondIdx = fullText.indexOf(sample, firstIdx + sample.length);
                                        if (secondIdx > firstIdx) {
                                            fullText = fullText.substring(0, secondIdx);
                                        }
                                        // Throw a typed error so synthesis methods can catch and
                                        // retry via Claude. The salvaged prefix is attached to the
                                        // error so the caller has a fallback signal. The old
                                        // behavior (parse the salvaged fragment) remains available
                                        // for callers that don't opt into Claude fallback.
                                        const repErr: any = new Error('RepetitionCollapse');
                                        repErr.code = 'RepetitionCollapse';
                                        repErr.salvaged = fullText;
                                        repErr.sample = sample.substring(0, 30);
                                        repErr.occurrences = occurrences;
                                        throw repErr;
                                    }
                                }
                            }
                        }
                    }
                } catch (streamError: any) {
                    // RepetitionCollapse must propagate to the caller so the
                    // synthesis method can retry via Claude. Don't let it get
                    // treated as a network error and retry on the same Gemini
                    // path (which will just collapse again).
                    if (streamError?.code === 'RepetitionCollapse') {
                        throw streamError;
                    }
                    const isNetworkError = streamError?.message?.includes('Failed to fetch') ||
                        streamError?.message?.includes('NETWORK') ||
                        streamError?.message?.includes('network') ||
                        streamError?.message?.includes('ECONNRESET') ||
                        streamError?.message?.includes('socket hang up');

                    if (isNetworkError && !fullText && attempt < MAX_STEP_RETRIES - 1) {
                        const retryDelay = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s, 40s
                        console.warn(`Stream failed with network error (attempt ${attempt + 1}/${MAX_STEP_RETRIES}), retrying in ${Math.round(retryDelay/1000)}s...`, streamError.message);
                        await wait(retryDelay);
                        lastError = streamError;
                        continue; // Retry the entire step
                    }
                    console.warn("Stream interrupted, attempting to repair JSON", streamError);
                    if (!fullText) throw streamError;
                }

                const cleanedText = tryRepairJson(fullText);

                if (!cleanedText) {
                    throw new Error("Empty response from model after repair attempt");
                }

                try {
                    const parsed = JSON.parse(cleanedText) as T;
                    if (!parsed || typeof parsed !== 'object') {
                        throw new Error("Response was not a valid object");
                    }
                    // Check if tryRepairJson wrapped a non-JSON response
                    if ((parsed as any)._error) {
                        console.warn("Model returned non-JSON, will retry:", (parsed as any)._raw?.substring(0, 80));
                        throw new Error(`Model returned non-JSON text: ${(parsed as any)._raw?.substring(0, 60)}`);
                    }
                    // 2026-05-05 - Defense-in-depth strip: deletes any leaked
                    // "EVIDENCE GAP" / "Evidence Gap" / "TBD" / "[needs baseline]"
                    // QA-annotation tokens from every string field before the
                    // generator hands the deliverable to the renderer or wiki
                    // archiver. Prompts forbid these tokens; this layer
                    // guarantees they never reach the user even if the model
                    // ignores the instruction.
                    try {
                        const { stripQAAnnotationsDeep } = await import('./slidePostProcessor');
                        return stripQAAnnotationsDeep(parsed);
                    } catch (e) { /* non-blocking - return raw if strip fails */ }
                    return parsed;
                } catch (e) {
                    console.error("Critical JSON Parse Error", e, "Raw:", cleanedText.substring(0, 100) + "...");
                    throw new Error(`Failed to parse Gemini response: ${e instanceof Error ? e.message : 'Unknown Error'}`);
                }
            } catch (stepError: any) {
                // RepetitionCollapse propagates up - it needs to reach the
                // synthesis method for Claude-fallback routing. Don't retry
                // on the Gemini path for this error class.
                if (stepError?.code === 'RepetitionCollapse') {
                    throw stepError;
                }
                lastError = stepError;
                const isNetworkError = stepError?.message?.includes('Failed to fetch') ||
                    stepError?.message?.includes('NETWORK') ||
                    stepError?.message?.includes('ECONNRESET') ||
                    stepError?.message?.includes('non-JSON text');

                if (isNetworkError && attempt < MAX_STEP_RETRIES - 1) {
                    const retryDelay = 5000 * Math.pow(2, attempt); // 5s, 10s, 20s, 40s
                    console.warn(`Step failed with network error (attempt ${attempt + 1}/${MAX_STEP_RETRIES}), retrying in ${Math.round(retryDelay/1000)}s...`);
                    await wait(retryDelay);
                    continue;
                }
                throw stepError;
            }
        }
        throw lastError;
    }
}

/**
 * Post-generation validation - ports hook logic into the pipeline.
 * Returns { valid: boolean, failures: string[] }.
 * When valid is false, the pipeline should retry with failures as feedback.
 */
function validateDeliverableOutput(
    deliverable: any,
    deliverableType: string,
    prioritySources?: string[]
): { valid: boolean; failures: string[] } {
    const failures: string[] = [];
    const allText = JSON.stringify(deliverable);

    // CHECK 1: Priority sources must appear
    if (prioritySources) {
        for (const ps of prioritySources) {
            if (!allText.toLowerCase().includes(ps.toLowerCase())) {
                failures.push(`PRIORITY MISSING: '${ps}' not cited`);
            }
        }
    }

    // CHECK 2: No unresolved CHUNK references
    const chunks = allText.match(/\[CHUNK_\d+\]/g);
    if (chunks) {
        const unique = Array.from(new Set(chunks));
        failures.push(`UNRESOLVED: ${unique.length} CHUNK refs: ${unique.slice(0, 3).join(', ')}`);
    }

    // CHECK 3: Walk citations arrays - no empty, no generic
    const GENERIC = new Set(['research', 'studies', 'data', 'sources', 'intelligence_sources', 'analysis', 'evidence', 'findings', 'reports', 'literature']);
    const walkCitations = (obj: any, path: string) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach((item, i) => walkCitations(item, `${path}[${i}]`));
            return;
        }
        if (obj.citations && Array.isArray(obj.citations)) {
            if (obj.citations.length === 0 && (obj.title || obj.name || obj.capability || obj.initiative || obj.phase)) {
                failures.push(`EMPTY CITATIONS: ${obj.title || obj.name || obj.capability || obj.initiative || obj.phase}`);
            }
            for (const c of obj.citations) {
                if (typeof c === 'string' && GENERIC.has(c.toLowerCase().trim())) {
                    failures.push(`GENERIC: '${c}' is not a real source name`);
                }
            }
        }
        for (const v of Object.values(obj)) {
            if (typeof v === 'object') walkCitations(v, path);
        }
    };
    walkCitations(deliverable, deliverableType);

    // CHECK 4: Evidence specificity (for items with evidenceBasis)
    const walkEvidence = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(walkEvidence); return; }
        if (typeof obj.evidenceBasis === 'string') {
            const eb = obj.evidenceBasis;
            if (eb.length < 20) {
                failures.push(`THIN EVIDENCE: '${obj.title || obj.name || 'unknown'}' evidenceBasis too short`);
            } else {
                const hasNumber = /\d+%|\$\d|20[12]\d/.test(eb);
                const hasQuote = eb.includes('"');
                const hasName = eb.split(' ').some((w: string, i: number) => i > 0 && w.length > 3 && w[0] === w[0].toUpperCase() && /[a-zA-Z]/.test(w[0]));
                if (!hasNumber && !hasQuote && !hasName) {
                    failures.push(`VAGUE EVIDENCE: '${obj.title || obj.name || 'unknown'}' has no specifics`);
                }
            }
        }
        for (const v of Object.values(obj)) {
            if (typeof v === 'object') walkEvidence(v);
        }
    };
    walkEvidence(deliverable);

    return { valid: failures.length === 0, failures };
}
