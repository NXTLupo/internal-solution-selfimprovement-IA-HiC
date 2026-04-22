
import { GoogleGenAI, Type, Schema, Chat, GenerateContentResponse } from "@google/genai";
import { FileUpload, AnalysisResult, Persona, ScriptScene, Slide, SlideLayout, StepResult_Ingestion, StepResult_Themes, StepResult_Personas, StepResult_Structure, StepResult_Narrative, StepResult_Final, Theme, SlideStyle, Citation, StrategicRecommendation, OutputOption, StepResult_JourneyMap, StepResult_TechArch, ServiceBlueprintStage, TechnicalArchitecture, TechNode, TechFlow, PRD, StepResult_PRD, StrategicRoadmap, StepResult_Roadmap, StepResult_Recommendations, StepResult_CrossCuttingSynthesis, DeckInputContext, ContentBlock } from "../types";
import { tryRepairJson } from './aiRouter';
import { getActiveConstraints } from './promptImprovementEngine';

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

// Global visualization style — set by App.tsx when user selects a style
let _activeVisStyleId: string = 'photorealistic';
export function setActiveVisualizationStyle(styleId: string) { _activeVisStyleId = styleId; }
export function getActiveVisualizationStyle(): string { return _activeVisStyleId; }

/**
 * Generate a photorealistic portrait using Imagen 4.
 * Bypasses the NXT Design System style prompts — portraits must be photorealistic, not flat geometric.
 * CSS grayscale filter is applied at render time, not at generation time.
 */
export const generatePortrait = async (prompt: string): Promise<string | undefined> => {
    // Use the SAME model and config that works for all other image generation
    // gemini-2.5-flash-image with imageConfig — the proven working approach
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
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
        // Open prompt mode — no NXT style restrictions. User describes whatever they want.
        const noTextConstraint = 'Do NOT include any text, words, letters, numbers, or labels in this image.';
        finalPrompt = `${prompt}. Professional quality, high resolution. ${noTextConstraint}`;
    } else {
        // NXT style mode — flat geometric business minimalism
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
      model: 'gemini-2.5-flash-image',
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
        model: 'gemini-2.5-flash',
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

        const systemInstruction = `
            You are an elite CX consulting partner (McKinsey/BCG/IDEO caliber) powered by advanced AI and a persistent, compounding knowledge architecture.

            CORE OBJECTIVE: Produce consulting-grade deliverables from research evidence.
            RESEARCH GOAL: "${this.goal}"
            ANALYSIS APPROACH: "${this.approach}"
            ${lensPromptSegment}
            ${frameworkInstructions}

            ${wikiKnowledge ? `
=== COMPILED KNOWLEDGE FROM WIKI (persistent, compounding) ===
The following knowledge has been compiled from the NXT Humans wiki layer.
This is NOT generated from scratch — it represents accumulated consulting
methodology, anti-patterns, benchmark data, and brand standards that have
been refined across multiple engagements. ALWAYS prefer this compiled
knowledge over re-deriving from training data.

${wikiKnowledge}
=== END WIKI KNOWLEDGE ===
            ` : ''}

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
            Anti-slop business flat minimalism. Stark white canvas (#FFFFFF).
            Bebas Neue headlines, Archivo body, JetBrains Mono code.
            Chartreuse (#B8B800) power accent <= 15% of surface. Cyan (#00B7C3) secondary.
            NO gradients, shadows, 3D, organic shapes, pie charts, rounded corners > 4px.
            NO Inter, Roboto, Arial, Poppins. NO purple, pink, orange palettes.
            Every chart title is a CONCLUSION sentence, not a topic label.
            Source every data point. Y-axis starts at zero.

            JSON OUTPUT RULES:
            - ALWAYS output valid JSON. No markdown code fences, no trailing commas, no comments.
            - The "methodology" field should be 1-3 sentences (brief reasoning transparency).
            - For theme/ingestion steps: keep individual field values concise (under 60 words each).
            - For persona steps: generate COMPLETE, DETAILED output — personas require rich data across all fields. Do NOT truncate personas. Generate 4-6 fully populated personas.
            - For recommendation/roadmap steps: be thorough — every recommendation needs full detail.

            CRITICAL TRANSPARENCY AND CITATION RULES:
            - Streaming Reasoning: For every step, output a "methodology" string inside the JSON object.
            - Include [PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT] tags in the methodology.
            - CITATION REQUIREMENT: Every factual claim MUST cite its source using [CHUNK_XXX] format.
            - The research corpus contains items tagged as [CHUNK_001], [CHUNK_002], etc.
            - Each chunk header shows "SOURCE: [source name]" — use this source name when citing.
            - When generating themes: include full citation objects with sourceFile, sourceName, text, and url.
            - The "sourceName" field is CRITICAL — it MUST match the SOURCE header (e.g. "Higher Ed Dive", "OpenAlex", "Reddit: r/highereducation"). This is what humans read.
            - The "text" field MUST be a VERBATIM quote copy-pasted from the chunk (10-30 words exactly as written).
            - When generating persona pain points: cite the specific chunk AND source name that evidences each pain point.
            - When generating recommendations: cite the chunks that support each recommendation.
            - When generating deck slides: every slide quote field must contain a real verbatim quote with source attribution.
            - If a claim cannot be traced to a specific chunk, prefix it with "[No direct source]".
            - Prioritize claims from sources that MOST DIRECTLY address the research objective, regardless of source type.
        ${getActiveConstraints()}`;

        this.chatSession = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.1, // Low temperature for higher structural stability
            }
        });
    }

    async updateContext(contextLabel: string, data: any): Promise<void> {
        // Token budget protection: send a COMPACT summary instead of full JSON.
        // Full JSON per stage can be 50-100KB. After 8 stages + step responses,
        // the accumulated chat history would exceed Gemini's 1M token limit.
        // Cap at 8KB per update — enough for the model to track edits.
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
                            fileParts.push({ text: `\n[BACKUP TEXT EXTRACTION FROM ${file.name} — ensuring no content is missed by binary parsing:]\n${extractedText}` });
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
                        fileParts.push({ text: `[EXTRACTED TEXT FROM ${file.name} — Office document, partial extraction. Some formatting may be lost.]\n\n${textContent.substring(0, 50000)}` });
                    } else {
                        // Fallback: send as PDF-like inline data and hope Gemini can handle it
                        fileParts.push({ inlineData: { mimeType: 'application/pdf', data: file.data } });
                        fileParts.push({ text: `[NOTE: ${file.name} sent as binary document. If content appears garbled, the user should re-upload as PDF.]` });
                    }
                } catch (e) {
                    fileParts.push({ inlineData: { mimeType: 'application/pdf', data: file.data } });
                    fileParts.push({ text: `[NOTE: ${file.name} — Office document sent as binary. Content may need manual verification.]` });
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

You are performing the INGEST operation from a persistent knowledge architecture. Your job is NOT to skim — it is to deeply read, extract, and synthesize ALL provided evidence IN SERVICE OF THE USER'S RESEARCH OBJECTIVE.

THE USER'S RESEARCH OBJECTIVE:
"${this.goal}"

ANALYSIS APPROACH: ${this.approach}

Everything you read, extract, and synthesize must be evaluated through this lens: HOW DOES THIS EVIDENCE SERVE THE RESEARCH OBJECTIVE ABOVE? What does it reveal about the challenges, opportunities, stakeholders, and landscape relevant to this specific goal?

WHAT YOU HAVE RECEIVED:

PRIORITY 1 — CLIENT-UPLOADED DOCUMENTS (${uploadedFileCount} files):
These are the client's OWN materials — proposals, SOWs, transcripts, strategies, budgets.
They represent the SPECIFIC organizational context that no external source can provide.
READ THESE FIRST. READ EVERY PAGE. These define the project scope, stakeholders, goals,
constraints, and organizational reality. The client uploaded them because they are essential.
If the document is a proposal or SOW, extract: project scope, deliverables, timeline,
stakeholders, budget, strategic goals, and any specific organizational challenges mentioned.
DO NOT claim these documents are absent or missing — they are right here in the file list.

${hasIntelligenceCorpus ? `PRIORITY 2 — INTELLIGENCE CORPUS (from 100+ external sources):
Items tagged as [CHUNK_001], [CHUNK_002], etc. with source attribution.
These provide external context, benchmarks, industry trends, and evidence to COMPLEMENT
the client documents. Use them to validate, challenge, or enrich what the client documents say.` : ''}

Total files passed to you: ${totalFileCount}

YOUR TASK:
1. Read EVERY uploaded client document FIRST and THOROUGHLY — extract every detail about the project, stakeholders, goals, and constraints
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
Cite chunks from across the FULL corpus range — not just the first 50.

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

        const result = await this.executeStep<StepResult_Ingestion>(prompt, schema, fileParts, onStream);
        // Ensure arrays exist to prevent runtime errors
        if (!result.dataTypesIdentified) result.dataTypesIdentified = [];
        if (!result.keyStakeholders) result.keyStakeholders = [];
        if (!result.documents) result.documents = [];
        return result;
    }

    async generateThemes(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Themes> {
        // Load Agent Skill for theme analysis
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('THEMES'); } catch (e) { /* skill unavailable */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: THEME ANALYST ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP 2: STRATEGIC THEME EXTRACTION. You are a senior research analyst performing rigorous thematic analysis.

RESEARCH OBJECTIVE: "${this.goal}"

METHODOLOGY: Perform MULTI-DIMENSIONAL thematic analysis across these 6 lenses. The lenses are a HEURISTIC for where to look — NOT a quota. SKIP any lens that lacks strong multi-source evidence. It is FAR better to return 4 specific, evidence-rich themes than 12 themes padded with meta-complaints about the corpus itself.

1. POLICY & REGULATORY: Government actions, legislation, compliance requirements, regulatory shifts
2. TECHNOLOGY & INNOVATION: Tools, platforms, AI adoption, digital transformation, emerging tech
3. FINANCIAL & ECONOMIC: Funding, budgets, revenue models, costs, economic trends, ROI
4. STAKEHOLDER & HUMAN: People impacts, workforce, demographics, equity, culture, sentiment
5. STRATEGIC & COMPETITIVE: Market position, competition, partnerships, differentiation, growth
6. OPERATIONAL & PROCESS: Workflows, efficiency, service delivery, infrastructure, best practices

META-THEMES ARE FORBIDDEN (HARD RULE — NON-NEGOTIABLE):
A theme describes a PATTERN OR FINDING FROM THE EVIDENCE. A meta-theme complains about the evidence itself. Meta-themes are INSTANTLY REJECTED.

FORBIDDEN theme names (these will be filtered out post-generation):
  ✗ "General higher education news lacking advancement focus"
  ✗ "Pervasive lack of quantified advancement case studies"
  ✗ "Insufficient data for specific advancement modernization benchmarking"
  ✗ "Anecdotal criticism of industry conferences for productivity"
  ✗ "Marketing claims versus quantified institutional outcomes" (if it describes what the corpus lacks, not what it shows)
  ✗ "Limited evidence on X" / "Scarcity of data on Y" / "Absence of Z"
  ✗ "Corpus dominated by [source type]" / "Underrepresentation of [topic]"

A meta-theme contains these patterns — reject before emission:
  • "lack of", "lacking", "absence of", "scarcity of", "insufficient", "missing", "limited evidence"
  • "anecdotal", "unquantified", "dominant headlines without body", "pervasive gaps"
  • "[X] news lacking [Y]", "[X] claims versus [Y] outcomes" (when contrasting corpus-provided vs corpus-missing)
  • References to the corpus, dataset, sources, or evidence base as the subject of the theme

ACCEPTABLE alternatives when a lens has thin evidence:
  • Skip the lens entirely (fewer themes is better than slop themes)
  • Report it as an EVIDENCE GAP in a deliberate callout — NOT as a theme
  • Request more data via the retrieval tool before manufacturing a theme

If you cannot find 4+ evidence-rich themes without padding, output fewer themes and add a single "evidenceGap" field at the top level listing the research questions you couldn't ground in real data.

SOURCE DIVERSITY REQUIREMENT (critical):
Your corpus contains evidence from MULTIPLE source types. ALL sources start with EQUAL credibility — their value is determined by what they actually contribute to the research objective, not by where they came from. The corpus includes:
- CLIENT DOCUMENTS: Uploaded PDFs, proposals, SOWs, transcripts — the client's specific organizational context
- ACADEMIC PAPERS: OpenAlex, Crossref, Semantic Scholar, ERIC — peer-reviewed research
- NEWS & INDUSTRY: Higher Ed Dive, GDELT, industry blogs — current trends and developments
- GOVERNMENT DATA: College Scorecard, Federal Register, Data.gov — official statistics and policy
- SOCIAL/COMMUNITY: Reddit, forums — unfiltered practitioner sentiment and grassroots experience

EVIDENCE EVALUATION RULES:
- Judge EVERY source by its SPECIFIC CONTRIBUTION to the research objective, not its category
- A Reddit post from an advancement VP describing exactly the client's problem is MORE valuable than an academic paper about philanthropy in a different country
- An uploaded SOW detailing the client's budget and timeline is MORE valuable than 50 news articles about general fundraising trends
- The strongest themes have CONVERGENT evidence: multiple independent sources — regardless of type — pointing to the same finding
- Every theme MUST cite sources from at least 2 DIFFERENT source names (not just Reddit + Reddit)
- After extracting themes, mentally rank which sources ACTUALLY contributed the most — that's the real credibility assessment

EXTRACTION RULES:
- Analyze EVERY chunk in the corpus — client docs, intelligence sources, AND social data
- Each chunk may support MULTIPLE themes. A single source can contribute to 3-5 themes.
- Name themes specifically (BAD: "Technology". GOOD: "AI-Powered Donor Matching Platforms Reshape Fundraising")
- Description: 3-5 sentences with specific data points, statistics, names, dates from the evidence
- Minimum: Generate at least 12 themes. With a corpus of 500+ chunks, generate 15-25 themes.
- Maximum: No cap. If the evidence supports 30 themes, generate 30.
- Mark each theme as "priority" (strong multi-source evidence), "emerging" (moderate, 1-2 source types), or "weak" (single source type)

MANDATORY SOURCE COVERAGE — READ THE ENTIRE CORPUS:
The corpus is organized with Tier 1 sources (academic, government) FIRST, Tier 2 (news) SECOND, Tier 3 (community) LAST.
You MUST extract themes from ALL THREE tiers. Do NOT stop reading after the first 100 chunks.
Scan the ENTIRE corpus — check CHUNK numbers. If the corpus goes to CHUNK_400+, you must cite chunks from across the full range, not just CHUNK_001 through CHUNK_050.
A valid theme analysis has citations spread across: early chunks (CHUNK_001-100), middle chunks (CHUNK_100-300), AND late chunks (CHUNK_300+).
If all your citations are from the first 50 chunks, your analysis is INCOMPLETE — go back and read the rest.

CITATION REQUIREMENTS (non-negotiable):
- Each theme MUST cite 3+ chunks from at least 2 different source types
- "sourceFile" = CHUNK ID (e.g. "CHUNK_001") from corpus
- "text" = VERBATIM quote from that chunk (10-30 words, copy-pasted exactly)
- "url" = URL from the chunk metadata (appears after "URL:" in chunk header)
- "sourceName" = source name from the SOURCE header (e.g. "Higher Ed Dive", "OpenAlex")
- "author" = author if present, empty string otherwise
- "publicationDate" = date from "Date:" line, empty string otherwise
- "quote" = the single BEST direct quote exemplifying this theme (with chunk reference)
- "isCrossDocument" = true if evidence spans 2+ different source names (this should be TRUE for most themes)

CRITICAL — EXTERNAL INTELLIGENCE DIVERSITY MANDATE:
The corpus contains UPLOADED CLIENT DOCUMENTS (3-10 PDFs) and EXTERNAL INTELLIGENCE (~200 articles from academic, news, government, social, AI sources).
- At least 50% of themes MUST be grounded primarily in EXTERNAL intelligence (not uploaded PDFs)
- At least 30% of ALL citations must come from external sources (Higher Ed Dive, Reddit, OpenAlex, ERIC, Federal Register, arXiv, NIST, etc.)
- Uploaded documents provide organizational context. External intelligence provides evidence of trends, competition, and best practices.
- The STRONGEST themes weave both: external finding + client context alignment
- If you find yourself citing the same 4-5 uploaded PDFs for most themes, STOP and go read the CHUNK_XXX items from the intelligence_sources section of the corpus

ANTI-PATTERNS (these will be rejected):
- CLIENT-DOC DOMINANCE: More than 70% of citations referencing uploaded PDF filenames. The user included ~200 external articles — USE THEM.
- Themes derived ONLY from Reddit or social sources when academic/news data exists
- Generating only 1-2 themes from a corpus with 100+ chunks
- Generic theme names without specificity
- Descriptions that don't cite specific evidence
- Missing URLs when the chunk clearly has one
- All themes from the same source type (e.g., all from Reddit, ignoring academic papers)
- ECHO CHAMBER: Multiple themes restating the same finding instead of diverse findings from different source categories

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
                            status: { type: Type.STRING }
                        },
                        required: ["name", "description", "quote", "citations", "isCrossDocument"]
                    }
                }
            },
            required: ["methodology", "themes"]
        };
        const result = await this.executeStep<StepResult_Themes>(prompt, schema, [], onStream);
        if (!result.themes) result.themes = [];
        // 2026-04-21 — META-THEME POST-FILTER. The prompt forbids meta-themes,
        // but models still occasionally manufacture them when evidence is thin.
        // This filter catches themes whose NAME describes what the corpus LACKS
        // rather than what it shows — "General higher ed news lacking
        // advancement focus", "Pervasive lack of quantified case studies",
        // "Insufficient data for X benchmarking", etc. Filtered themes are
        // dropped and logged; they never reach the KG or any deliverable.
        // 2026-04-22 TIGHTENED. Prior version triggered on bare "insufficient",
        // "limited coverage", "anecdotal" — which match legitimate domain
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
            // Proximity check — the two patterns must co-occur within 80 chars
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
        return result;
    }

    async generatePersonas(themesInput: any | undefined, feedback: string | undefined, onStream: (t: string) => void, onStatus: (s: string) => void): Promise<StepResult_Personas> {
        // =====================================================================
        // TWO-PHASE PERSONA GENERATION
        // Phase A: Get persona roster (names, roles, core identity) — lightweight
        // Phase B: Enrich each persona individually — one call per persona
        // This defeats Gemini's output truncation which kills single-call approaches.
        // =====================================================================

        onStatus("Phase A: Identifying Archetypes...");

        // --- PHASE A: Lightweight roster ---
        const rosterPrompt = `STEP 3A: PERSONA ROSTER. Identify as many distinct archetypes as the evidence supports (minimum 4, maximum 8). Let the data determine the count — if the research reveals 7 distinct stakeholder groups, generate 7 personas.

RESEARCH OBJECTIVE: "${this.goal}"

Analyze ALL themes and evidence. Identify personas with DIFFERENT roles, perspectives, and segments. Do not force exactly 5 — use as many as the data warrants within the 4-8 range.
${feedback ? `USER FEEDBACK (follow this direction): "${feedback}"` : ''}

For each persona provide: name (archetype title), role (professional context), demographics (age/background), quote (15-25 word first-person voice), and a one-sentence summary of their core tension.
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

        const roster = await this.executeStep<{ methodology: string; personas: any[] }>(rosterPrompt, rosterSchema, [], onStream);
        if (!roster.personas || roster.personas.length === 0) {
            roster.personas = [{ name: 'Primary Stakeholder', role: 'Key decision maker', demographics: '', quote: '', coreTension: '' }];
        }

        onStream(`Identified ${roster.personas.length} archetypes: ${roster.personas.map(p => p.name).join(', ')}`);

        // --- PHASE B: Enrich each persona individually ---
        const enrichSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                bio: { type: Type.STRING },
                jtbd: { type: Type.STRING },
                goals: { type: Type.OBJECT, properties: { lifeGoal: {type:Type.STRING}, experienceGoal: {type:Type.STRING}, functionalGoal: {type:Type.STRING} } },
                fiveWs: { type: Type.OBJECT, properties: { who: {type:Type.STRING}, what: {type:Type.STRING}, whenWhere: {type:Type.STRING}, why: {type:Type.STRING} } },
                attributes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, behavior: {type:Type.STRING} }, required: ["name", "behavior"] } },
                motivations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING} }, required: ["label"] } },
                painPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                opportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: {type:Type.STRING}, quote: {type:Type.STRING}, source: {type:Type.STRING} }, required: ["label", "quote", "source"] } },
                confidenceLevel: { type: Type.STRING },
                evidenceCount: { type: Type.NUMBER },
            },
            required: ["bio", "jtbd", "goals", "fiveWs", "attributes", "motivations", "painPoints"]
        };

        const enrichedPersonas: any[] = [];

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
                ? `\nRESEARCH EVIDENCE (from ${themes.length} themes with ${relevantEvidence.length} citations — use these to ground the persona):\n${relevantEvidence.slice(0, 20).join('\n')}\n`
                : '';

            // Load persona skill for enrichment
            let personaSkill = '';
            try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); personaSkill = await loadSkillPrompt('PERSONAS'); } catch (e) { /* skill unavailable */ }

            const enrichPrompt = `${personaSkill ? `=== AGENT SKILL: PERSONA ARCHITECT ===\n${personaSkill}\n=== END SKILL ===\n\n` : ''}You are a CX persona researcher. Research goal: "${this.goal}".

ENRICH this persona with COMPLETE detail grounded in the RESEARCH EVIDENCE provided below. Every pain point, motivation, and opportunity must cite a specific source. Output a JSON object with ALL fields populated.

PERSONA: "${p.name}"
Role: ${p.role}. Demographics: ${p.demographics || 'N/A'}. Core tension: ${p.coreTension || 'N/A'}.
${evidenceContext}
REQUIRED JSON FIELDS (populate EVERY field — empty fields are a failure):
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
- "motivations": [{ "label": "motivation name", "quote": "VERBATIM quote from a specific research source", "source": "source name (e.g., 'Higher Ed Dive', 'Reddit: r/cscareerquestions', 'OpenAlex: Smith 2024')" }] (3-4 items)
  CRITICAL: Every motivation MUST have a real source name and a direct quote from the evidence. NEVER use generic sources like "research" or "studies."
- "tasks": [{ "label": "task description grounded in research" }] (3-4 items)
- "painPoints": [{ "label": "pain point from evidence", "quote": "VERBATIM quote from a specific source proving this pain", "source": "real source name" }] (3-4 items)
  CRITICAL: Every pain point MUST cite a specific source by name with a direct quote. These are the evidence chains that make personas credible.
- "opportunities": [{ "label": "opportunity from evidence", "quote": "evidence supporting this opportunity", "source": "source name" }] (2-3 items)
- "confidenceLevel": "EVIDENCED" if 70%+ of fields cite specific sources, "PARTIALLY_EVIDENCED" if 40-70%, "HYPOTHESIS" if <40%
- "evidenceCount": actual number of distinct sources cited across all fields`;

            try {
                // Standalone call bypasses the polluted chat session
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const enrichResponse = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-2.5-flash',
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
             const ageHint = p.demographics?.match(/\d+/) ? p.demographics.match(/\d+/)?.[0] + ' year old' : 'professional';
             const portraitPrompt = `Professional headshot portrait photograph of a ${ageHint} ${p.role || 'professional'}. Neutral expression, direct eye contact with camera. Studio lighting with soft key light and subtle fill. Shallow depth of field, clean neutral background. Editorial photography style. Shot on Phase One IQ4 150MP medium format camera, 80mm lens f/2.8. High resolution, photorealistic, NOT illustration, NOT cartoon, NOT clip art, NOT 3D render. Real human face with natural skin texture and lighting.`;
             const url = await generatePortrait(portraitPrompt);
             personasWithImages.push({ ...p, imageUrl: url });
        }
        return { ...result, personas: personasWithImages };
    }

    async generateRecommendations(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Recommendations> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('STRATEGIC_RECS'); } catch (e) { /* skill unavailable */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: STRATEGY AUTHOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: STRATEGIC RECOMMENDATIONS. You are a senior management consultant performing problem-solution mapping.

METHODOLOGY:
1. First, review ALL themes and ALL persona pain points identified in previous steps
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
- citations: Array of 2-4 source names that evidence this recommendation (e.g., "Higher Ed Dive", "Reddit: r/cscareerquestions", "OpenAlex: Smith 2024")
- evidenceBasis: 1-2 sentences summarizing the specific data that proves this recommendation is needed. Include statistics, quotes, or findings.
- Every recommendation must map to at least one theme or persona pain point

ANTI-PATTERNS (do NOT do these):
- "Proactively engage stakeholders" -- too vague
- "Leverage AI for operational efficiency" -- generic consultant-speak
- "Foster inclusive environments" -- no specificity on HOW

GOOD EXAMPLES:
- "Deploy predictive donor scoring to replace manual prospect identification -- research shows gift officers spend 40% of time on low-potential prospects [CHUNK_012]"
- "Consolidate 15 departmental email tools into unified CRM to eliminate the 'invisible constituent' problem identified across 4 sources [CHUNK_003, CHUNK_017]"

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
        const result = await this.executeStep<StepResult_Recommendations>(prompt, schema, [], onStream);
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
                        model: 'gemini-2.5-flash',
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

        // Validate
        const validation = validateDeliverableOutput(result, 'recommendations');
        if (!validation.valid && !feedback) {
            console.log(`[Validation] ${validation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${validation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateRecommendations(validation.failures.join('. '), onStream);
        }

        // STRAT-01: Generate full 15-section strategy document in second pass
        // The recommendations become the "Coherent Actions" section of Rumelt's Kernel
        const stratPrompt = `STEP: FULL STRATEGY DOCUMENT. You have already generated ${result.recommendations.length} strategic recommendations. Now wrap them in a complete strategy.

RUMELT'S KERNEL TEST (non-negotiable structure):
1. DIAGNOSIS: Name THE central challenge. Be specific: "[Subject] faces [problem] because [root cause], costing [quantified impact]."
2. GUIDING POLICY: State the strategic approach. Not a goal — a DECISION: "We will [approach], which means choosing [X] over [Y]."
3. COHERENT ACTIONS: The ${result.recommendations.length} recommendations you already generated, grouped into MECE strategic pillars.

GENERATE ALL 15 SECTIONS:
1. Executive Summary (SCR format: Situation, Complication, Resolution — max 250 words)
2. Vision and Mission (the desired future state in 3-5 years)
3. Current State Assessment (Rumelt's DIAGNOSIS — what is broken and why)
4. Target State Definition (measurable outcomes, not aspirations)
5. Strategic Pillars (3-5 MECE themes that organize all recommendations)
6. Prioritized Initiatives (group the recommendations under pillars)
7. Governance Model (who decides, who executes, cadence)
8. Measurement Framework (KPIs per pillar, leading + lagging indicators)
9. Investment Case (effort estimates: people, budget, time per pillar)
10. Implementation Roadmap Summary (90-day, 6-month, 12-month milestones)
11. Risk Assessment (top 5 risks with probability, impact, mitigation)
12. Change Management Plan (stakeholder mapping, communication, training)
13. Communication Plan (audience-specific messaging, channels, cadence)
14. Quick Wins (3-5 actions achievable in 90 days that build momentum)
15. Long-term Vision (3-5 year aspirational state with milestones)

For sections where evidence is insufficient, flag as "EVIDENCE GAP" — NEVER silently omit.

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

PURPOSE: Look across ALL themes, ALL personas, and ALL recommendations SIMULTANEOUSLY to identify 3-5 cross-cutting strategic insights that no single deliverable captures on its own. These are the "hidden connections" — patterns that only emerge when you hold the entire body of work in view at once.

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

        const prompt = `${skillInstructions ? `=== AGENT SKILL: SERVICE BLUEPRINT MAPPER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}CRITICAL REQUIREMENTS FOR BLUEPRINT QUALITY:

SWIMLANE CELL CONTENT (B-01): Every intersection of [Persona] x [Stage] MUST have content.
For each cell, describe: what this persona does at this stage, their emotional state, and their key need.
If a persona is NOT involved at a stage, write "Not involved" — NEVER leave a cell empty.
Empty cells in a blueprint are worse than no blueprint at all.

FAIL POINTS (B-03): For each stage, identify the most likely failure mode.
Mark with a fail_point field: what fails, estimated frequency, and consequence.
Minimum 1 fail point per 2 stages. These are the highest-value elements of a blueprint.

TECHNOLOGY LAYER (B-05): Add a technology/systems field to each stage.
List the specific systems, platforms, and tools that support each stage.
Example: "Blackbaud Raiser's Edge NXT, SIS integration, AI donor prediction model"

EMOTION LINE: Each stage must have an emotion field with: emotion name AND intensity score (1-5).
Not just colored dots — named emotions with scores.

STEP: PERSONA-DRIVEN SERVICE BLUEPRINT. You are a senior service designer creating an evidence-based, persona-aware service blueprint.

CRITICAL: This blueprint must map how EACH PERSONA (identified in Step 3) experiences the service differently. A university president navigates the journey differently than a frontline fundraiser or a donor.

METHODOLOGY:
1. Review ALL personas from Step 3 — their roles, pain points, motivations, and tasks
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
- emotion: "Delighted" | "Positive" | "Neutral" | "Negative" | "Frustrated" — justified by evidence
- painPoint: Specific friction with [CHUNK_XXX] citation. What breaks, fails, or frustrates?
- opportunityForImprovement: What could be done better (linked to recommendations from Step 5)
- valueProposition: What value is delivered or promised to the actor at this stage
- momentOfTruth: Is this a critical make-or-break moment? (true/false) — moments where the experience succeeds or fails

EVIDENCE GROUNDING:
- EVERY painPoint, actorBehaviors, and emotion must cite [CHUNK_XXX]
- actors must reference persona names from Step 3
- opportunityForImprovement should reference recommendations from Step 5
- citations: For each stage, list 2-4 source names that evidence this stage (e.g., "Higher Ed Dive", "Reddit: r/highereducation", "OpenAlex: Jones 2024")
- evidenceBasis: 1-2 sentences summarizing the specific research evidence that informed this stage — quote data points, articles, or posts

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                stages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    phase: { type: Type.STRING },
                    actors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    actorNeeds: { type: Type.STRING },
                    actorBehaviors: { type: Type.STRING },
                    customerAction: { type: Type.STRING },
                    touchpoint: { type: Type.STRING },
                    frontstageAction: { type: Type.STRING },
                    backstageAction: { type: Type.STRING },
                    supportProcesses: { type: Type.STRING },
                    physicalEvidence: { type: Type.STRING },
                    emotion: { type: Type.STRING },
                    painPoint: { type: Type.STRING },
                    opportunityForImprovement: { type: Type.STRING },
                    valueProposition: { type: Type.STRING },
                    momentOfTruth: { type: Type.BOOLEAN },
                    fail_point: { type: Type.STRING },
                    technologySystems: { type: Type.STRING },
                    emotionIntensity: { type: Type.INTEGER },
                    citations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    evidenceBasis: { type: Type.STRING }
                }, required: ["phase", "actors", "actorNeeds", "actorBehaviors", "customerAction", "touchpoint", "frontstageAction", "backstageAction", "supportProcesses", "physicalEvidence", "emotion", "painPoint", "opportunityForImprovement", "valueProposition", "momentOfTruth", "fail_point", "technologySystems", "emotionIntensity", "citations", "evidenceBasis"] } }
            },
            required: ["methodology", "stages"]
        };
        const result = await this.executeStep<StepResult_JourneyMap>(prompt, schema, [], onStream);
        if (!result.stages) result.stages = [];

        // Phase 2: Enrich stages with thin evidence (token exhaustion on later stages)
        const thinStages = result.stages.filter(s => !s.citations?.length || !s.evidenceBasis || !s.fail_point);
        if (thinStages.length > 0 && result.stages.length > 0) {
            onStream(`Enriching ${thinStages.length} stages with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const stage of thinStages) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-2.5-flash',
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
            console.log(`[Validation] ${validation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${validation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateJourneyMap(validation.failures.join('. '), onStream);
        }

        // NXT Design System: No decorative AI diagrams. Service blueprints are rendered
        // as structured SVG from the stage data by the frontend component.
        return result;
    }

    async generatePRD(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_PRD> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('PRD'); } catch (e) { /* skill unavailable */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: PRD COMPILER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}SECTION COMPLETENESS REQUIREMENT (PRD-03): Generate ALL 16 sections per the Cagan/SVPG framework:
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
11. Release/launch criteria — phased rollout plan
12. Risk assessment with mitigations
13. Assumptions and open questions (TBD placeholders)
14. Out of scope / non-goals (prevents scope creep)
15. Timeline and milestones
16. Stakeholder sign-off matrix

For sections without data: flag as "EVIDENCE GAP" not silently omit.
Use MoSCoW priority on ALL features: Must-have | Should-have | Could-have | Won't-have

STEP: PRODUCT REQUIREMENTS DOCUMENT. You are a senior product manager translating research insights into actionable requirements.

METHODOLOGY: Map EVERY persona pain point and strategic recommendation to a concrete product feature. The PRD is the bridge between "what we learned" and "what we build."

TITLE: Create a specific, descriptive product/initiative name that reflects the research domain (NOT a generic version number or hash).

PURPOSE & OBJECTIVES: 3-5 sentences explaining:
- WHAT problem this product solves (cite specific themes from the research)
- WHO benefits (reference specific personas)
- HOW success will be measured (quantifiable metrics)

SUCCESS METRICS: 3-5 measurable KPIs tied to research findings (e.g., "Reduce prospect identification time by 40% — addresses [CHUNK_XXX] finding")

FEATURES (MoSCoW Prioritization):
- Generate features for EVERY major pain point identified across all personas
- Must-have: Features that directly address critical/high-severity problems from the research
- Should-have: Features addressing medium-severity issues
- Could-have: Enhancement opportunities identified in the data
- Won't-have (this release): Features explicitly deferred with rationale

FOR EACH FEATURE:
- name: Specific capability (NOT "Analytics Dashboard" — say "Real-Time Donor Engagement Scoring Dashboard")
- priority: Must-have / Should-have / Could-have / Won't-have
- description: 40-60 words covering: what it does, which persona it serves, which pain point it addresses, expected impact. Must cite [CHUNK_XXX].
- acceptanceCriteria: 2-3 testable conditions for "done"
- citations: Array of 2-3 source names that evidence the need for this feature (e.g., "Higher Ed Dive", "Reddit: r/cscareerquestions", "Persona: Sarah Chen pain point #2")
- evidenceBasis: 1-2 sentences with specific data proving this feature is needed. Quote the persona pain point or research finding.

ANTI-PATTERNS:
- Generic product names with version hashes
- Features not traceable to research evidence
- Missing acceptance criteria
- Features without citations or evidence basis

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                prd: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, purposeAndObjectives: { type: Type.STRING }, successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } }, sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sectionNumber: { type: Type.INTEGER }, title: { type: Type.STRING }, content: { type: Type.STRING }, evidenceGap: { type: Type.STRING } }, required: ["sectionNumber", "title", "content"] } }, features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, priority: { type: Type.STRING }, description: { type: Type.STRING }, acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING } }, required: ["name", "priority", "description", "citations", "evidenceBasis"] } } }, required: ["title", "purposeAndObjectives", "successMetrics", "sections", "features"] }
            },
            required: ["methodology", "prd"]
        };
        // PHASE 1: Generate PRD framework (title, purpose, metrics, sections)
        onStream('Phase 1: Generating PRD framework and sections...');
        const result = await this.executeStep<StepResult_PRD>(prompt, schema, [], onStream);
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
- name: Specific capability (NOT "Analytics Dashboard" — say "Real-Time Donor Engagement Scoring Dashboard")
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
            console.log(`[Validation] ${prdValidation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${prdValidation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generatePRD(prdValidation.failures.join('. '), onStream);
        }

        return result;
    }

    async generateRoadmap(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Roadmap> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('ROADMAP'); } catch (e) { /* skill unavailable */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: ROADMAP BUILDER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: STRATEGIC ROADMAP. You are a strategy consultant creating an evidence-based implementation roadmap.

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
- Balance across personas — don't over-index on one stakeholder group
- Include at least 1 initiative per persona archetype identified
- Every theme must have at least one initiative in each horizon

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                roadmap: { type: Type.OBJECT, properties: { vision: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { initiative: { type: Type.STRING }, horizon: { type: Type.STRING }, owner: { type: Type.STRING }, description: { type: Type.STRING }, dependencies: { type: Type.STRING }, successMetric: { type: Type.STRING }, strategicTheme: { type: Type.STRING }, confidenceLevel: { type: Type.STRING }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING } }, required: ["initiative", "horizon", "owner", "description", "successMetric", "strategicTheme", "confidenceLevel", "citations", "evidenceBasis"] } } }, required: ["vision", "items"] }
            },
            required: ["methodology", "roadmap"]
        };
        const result = await this.executeStep<StepResult_Roadmap>(prompt, schema, [], onStream);
        if (!result.roadmap) result.roadmap = { vision: "", items: [] } as any;
        if (!result.roadmap.items) result.roadmap.items = [];

        // Phase 2: Enrich roadmap items with thin evidence
        const thinItems = result.roadmap.items.filter(i => !i.citations?.length || !i.evidenceBasis);
        if (thinItems.length > 0) {
            onStream(`Enriching ${thinItems.length} roadmap items with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const item of thinItems) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-2.5-flash',
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
            console.log(`[Validation] ${roadmapValidation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${roadmapValidation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateRoadmap(roadmapValidation.failures.join('. '), onStream);
        }

        return result;
    }

    async generateTechArchitecture(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_TechArch> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('TECH_ARCH'); } catch (e) { /* skill unavailable */ }

        // TWO-PHASE: System map (nodes+flows) first, then architecture sections.
        // Single-call with 20 sections + nodes + flows always truncates.

        onStream("Phase A: Mapping technology components...");
        const mapPrompt = `${skillInstructions ? `=== AGENT SKILL: TECH ARCH GENERATOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: TECH ARCHITECTURE PHASE A — SYSTEM MAP.
Extract ALL technology components, systems, platforms, and integrations from the research.

OVERVIEW: 3-5 sentences describing the technology landscape.

NODES (minimum 6): Every system mentioned in the corpus. CITE where you found each system.
- id: unique identifier (e.g., "crm_1", "portal_web")
- label: Exact system name from research (e.g., "Salesforce CRM", "Student Portal")
- type: "User" | "Application" | "Database" | "Integration" | "External" | "AI/ML"
- description: What it does and current state. Must cite [CHUNK_XXX] where this system was mentioned.
- citations: Array of source names where this system was found (e.g., ["Client SOW", "Higher Ed Dive"])

FLOWS (minimum 5): Connections between nodes.
- fromId/toId: Node IDs
- action: What data/process moves between them
- status: "active" | "planned" | "broken"

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
        const map = await this.executeStep<any>(mapPrompt, mapSchema, [], onStream);

        onStream(`Found ${(map.nodes || []).length} nodes, ${(map.flows || []).length} flows. Phase B: Writing architecture sections...`);
        const sectionsPrompt = `STEP: TECH ARCHITECTURE PHASE B — ARCHITECTURE DOCUMENT SECTIONS.
Based on the system map (${(map.nodes || []).map((n: any) => n.label).join(', ')}), write 10 key architecture sections.
For each: sectionNumber, title, content (2-4 sentences with evidence), evidenceGap (if data is insufficient).
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
        const secs = await this.executeStep<any>(sectionsPrompt, sectionsSchema, [], onStream);

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

        return `\n\n=== AVAILABLE DELIVERABLE DATA (use ALL of this to build the deck) ===\nThe following deliverables have been generated by the research pipeline. Reformat this content into slide-appropriate layouts. Do NOT modify the original deliverables — the deck is a PRESENTATION of them.\n\n${sections.join('\n\n')}\n\n=== END DELIVERABLE DATA ===\n`;
    }

    async generateDeckStructure(feedback: string | undefined, context: DeckInputContext, onStream: (t: string) => void): Promise<StepResult_Structure> {
        // Use strategic report as primary source when available (report-first architecture)
        // Falls back to buildDeckDigest for backward compatibility when no report exists
        let digest: string;
        if (context.strategicReport) {
            const report = context.strategicReport;
            const sections = (report.sections || []).map(s =>
                `Section ${s.sectionNumber}: ${s.title} [${s.sourceDeliverable}]\n${s.content}\n${s.keyMetrics?.map(m => `  Metric: ${m.label} = ${m.value}`).join('\n') || ''}${s.keyQuote ? `\n  Quote: "${s.keyQuote.text}" -- ${s.keyQuote.attribution}` : ''}\n  Sources: ${(s.citations || []).join(', ')}`
            ).join('\n\n');
            digest = `\n\n=== STRATEGIC REPORT (synthesized from all deliverables — use this as primary source) ===
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
- Every slide title MUST be a COMPLETE SENTENCE stating a conclusion — NOT a topic label
  BAD: "Market Overview", "Current Challenges", "Recommendations"
  GOOD: "Young alumni giving declined 12% while overall fundraising grew 3%, creating a generational crisis"
- THE PARTNER TEST: A senior partner reading ONLY the slide titles in order must understand the complete argument.
- All arguments must be MECE (Mutually Exclusive, Collectively Exhaustive)

RUMELT'S KERNEL (the deck must contain all three):
1. DIAGNOSIS: ONE specific challenge with evidence.
2. GUIDING POLICY: ONE strategic choice that excludes alternatives.
3. COHERENT ACTIONS: 5-7 actions that support EACH OTHER.

NARRATIVE FRAMEWORK (Situation-Complication-Resolution):
Let the RICHNESS OF AVAILABLE DELIVERABLES determine deck size. Do NOT cap at 10-12 slides.

1. TITLE (1 slide, TITLE_SLIDE): Research title and objective.
2. EXECUTIVE SUMMARY (1-2 slides, CONTENT_DATA_PANEL or BENTO_GRID): Complete argument in SCR format. The most important slide — it must convince on its own.
3. SITUATION — What's happening:
   - Theme landscape slides (BENTO_GRID): Show research themes with key stats
   - Competitive positioning slides (CONTENT_DATA_PANEL or FULL_WIDTH_VIZ): Where we stand vs peers
   - Service blueprint pain points (PROBLEM_SOLUTION): Journey friction points
4. COMPLICATION — Why the status quo is unacceptable:
   - Persona tension slides (CONTENT_DATA_PANEL with persona image): Show real people affected. MUST include persona image.
   - Gap analysis slides (PROBLEM_SOLUTION): Critical capability gaps
   - Tech audit findings (BENTO_GRID): System fragmentation or debt
5. RESOLUTION — What to do:
   - Strategic recommendations (CONTENT_DATA_PANEL): Each with impact metrics
   - Roadmap overview (FULL_WIDTH_VIZ): NOW/NEXT/LATER horizons
   - PRD highlights (CONTENT_DATA_PANEL): Top features and priorities
   - Architecture direction (CONTENT_INSIGHT_CHART or BENTO_GRID): Technical path forward
6. CLOSE (1-2 slides, CONTENT_DATA_PANEL): Specific next steps with WHO does WHAT by WHEN. No marketing CTAs.

CONTENT-DRIVEN SLIDE PLANNING — include slides for EVERY available deliverable:
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
- CONTENT_DATA_PANEL: 55/45 split — text+bullets left, metric cards right
- CONTENT_INSIGHT_CHART: 55/45 split — text left, chart right
- FULL_WIDTH_VIZ: No split — heading + full-width data grid/table
- BENTO_GRID: 3-6 mixed cells (stats, quotes, indicators)
- PROBLEM_SOLUTION: 55/45 split — pain stat left, solution points right

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

        // Load engagement memory for cross-session context (G12)
        let engagementContext = '';
        try {
            const { loadEngagementMemory } = await import('./wikiService');
            const goalSlug = this.goal.substring(0, 60).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
            const memory = loadEngagementMemory(goalSlug);
            if (memory) engagementContext = `\nENGAGEMENT CONTEXT (from prior sessions on similar topics):\n${memory}\n`;
        } catch (e) { /* no engagement memory available */ }

        // Content-block schema — matches the SlideGeneration interface in types.ts
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
        const blockTypeReference = `CONTENT BLOCK TYPES (declare what the slide communicates — the engine picks the template):

1. hero_stat: A single dominant number that anchors the slide.
   Fields: { type: "hero_stat", value: "35%", unit: "decline", context: "First-year retention dropped 35% since 2020" }

2. evidence_bullets: 2-4 research findings, each citing a specific source.
   Fields: { type: "evidence_bullets", items: [{ text: "72% express career uncertainty", source: "Reddit: r/cscareerquestions" }, { text: "6 of 10 universities lack integration", source: "Hechinger Report" }] }

3. metric_cards: 2-4 KPI data points for a data panel.
   Fields: { type: "metric_cards", items: [{ label: "Dropout rate", value: "35%", trend: "+12% YoY" }, { label: "Career center usage", value: "23%", unit: "of students" }] }

4. quote_block: A VERBATIM quote from research with provenance.
   Fields: { type: "quote_block", text: "I applied to 200 positions and heard back from 3", attribution: "CS Senior, Reddit", source: "Reddit: r/cscareerquestions" }

5. persona_card: Reference to a persona (portrait image auto-injected by renderer).
   Fields: { type: "persona_card", name: "Sarah Chen", role: "First-Year Student", jtbd: "Navigate career prep confidently", quote: "I don't know what I don't know" }

6. problem_statement: A challenge backed by evidence.
   Fields: { type: "problem_statement", value: "73%", description: "of graduates report degree did not prepare them for workforce", severity: "critical" }

7. solution_points: 2-3 actionable recommendations.
   Fields: { type: "solution_points", items: [{ title: "Integrated Career Curriculum", description: "Embed career skills into first-year courses — addresses 73% preparedness gap" }] }

8. data_grid: 3-6 data points for a grid/bento layout.
   Fields: { type: "data_grid", items: [{ label: "T1 Sources", value: "47", description: "Academic papers and government data" }] }

9. journey_strip: A service blueprint stage.
   Fields: { type: "journey_strip", phase: "Onboarding", action: "Student completes intake survey", pain: "42% drop off at document upload", emotion: "Frustrated", mot: true }

10. comparison_row: Competitive or gap comparison.
    Fields: { type: "comparison_row", dimension: "AI Readiness", ours: "2.1/5", theirs: "3.8/5", gap: "1.7 points behind" }

11. narrative_text: 2-3 sentence analytical prose for the slide body.
    Fields: { type: "narrative_text", text: "The convergence of three factors..." }

12. section_label: Section divider text (used alone for section header slides).
    Fields: { type: "section_label", text: "Research Findings" }`;

        const sharedRules = `BLOCK COMPOSITION RULES:
- EVERY body slide MUST have at least one block with source attribution (evidence_bullets, quote_block, or metric_cards with source)
- Use 2-5 blocks per slide — mix types for visual richness

META-NARRATION BAN (violation = instant rejection):
NEVER use: "Good morning" | "Welcome to" | "Today we will" | "We now move to" | "In this section" | "In this presentation" | "As you can see" | "This slide shows" | "Thank you" | "Allow me to" | "Before we begin" | "Let us examine"
LEAD with the insight. First word of the title = the finding.

STORYTELLING RULES:
- NEVER hedge: "It seems", "Perhaps", "It's possible that"
- Every title is a COMPLETE SENTENCE stating a conclusion (Pyramid Principle)
- Use SPECIFIC numbers, names, dates from the report sections — NEVER generalities
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
            // SECTION_HEADER: Deterministic — no AI needed
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

            // TITLE_SLIDE: Deterministic — no AI needed
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
                    model: 'gemini-2.5-flash',
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
        // directly pulls data from the strategic report sections into slides —
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

        const prompt = `${skillInstructions ? `=== AGENT SKILL: GAP ANALYSIS EVALUATOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: GAP ANALYSIS. You are a senior management consultant performing a rigorous gap analysis.

CAPABILITY EXTRACTION METHOD — follow these steps to DERIVE gaps from the research:

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
- Returning 0 gaps (impossible — every corpus has capability gaps)
- Gaps without [CHUNK_XXX] evidence citations
- Generic capability names ("improve technology") — be specific

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
                    gaps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, currentMaturity: { type: Type.NUMBER }, targetMaturity: { type: Type.NUMBER }, gap: { type: Type.NUMBER }, severity: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING }, citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING } }, required: ["capability", "currentMaturity", "targetMaturity", "gap", "severity", "impact", "effort", "citations", "evidenceBasis"] } },
                    prioritizedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, priority: { type: Type.STRING }, timeline: { type: Type.STRING }, gapReference: { type: Type.STRING } }, required: ["action", "priority", "timeline"] } },
                    quickWins: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } }, required: ["action", "impact", "effort"] } },
                    riskRegister: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { risk: { type: Type.STRING }, likelihood: { type: Type.STRING }, impact: { type: Type.STRING }, mitigation: { type: Type.STRING } }, required: ["risk", "likelihood", "impact", "mitigation"] } },
                }, required: ["assessmentScope", "currentState", "desiredState", "gaps", "prioritizedActions", "quickWins", "riskRegister"] }
            },
            required: ["methodology", "analysis"]
        };
        const gapResult = await this.executeStep<any>(prompt, schema, [], onStream);
        const analysis = gapResult?.analysis || {};

        // Phase 2: Enrich thin gaps + fill missing actions/risks
        const gaps = analysis.gaps || [];
        const thinGaps = gaps.filter((g: any) => !g.citations?.length || !g.evidenceBasis);
        if (thinGaps.length > 0) {
            onStream(`Enriching ${thinGaps.length} gaps with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const gap of thinGaps) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: [{ text: `Enrich this capability gap with evidence.\n\nCapability: ${gap.capability}\nCurrent: ${gap.currentMaturity}/5, Target: ${gap.targetMaturity}/5\nSeverity: ${gap.severity}\nImpact: ${gap.impact}\n\nProvide:\n1. citations: 2-3 source names evidencing this gap\n2. evidenceBasis: 1-2 sentences with specific data proving the maturity assessment\n\nOutput JSON.` }] },
                        config: { responseMimeType: 'application/json', temperature: 0.2 }
                    }), 2, 2000, `Enrich gap: ${gap.capability.substring(0, 30)}`);
                    const enriched = JSON.parse(tryRepairJson(enrichResp.text || '{}'));
                    if (enriched.citations?.length) gap.citations = enriched.citations;
                    if (enriched.evidenceBasis) gap.evidenceBasis = enriched.evidenceBasis;
                } catch (e) { /* non-blocking */ }
            }
        }

        // Phase 2B: Generate missing actions/risks if truncated
        if ((analysis.prioritizedActions?.length || 0) < 3 || (analysis.riskRegister?.length || 0) < 2) {
            onStream('Generating prioritized actions and risk register...');
            try {
                const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const actionsResp = await withRetry(() => standaloneAi.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ text: `Based on these capability gaps, generate prioritized actions and a risk register.\n\nGaps: ${gaps.map((g: any) => `[${g.severity}] ${g.capability}: gap ${g.gap}`).join('; ')}\n\nProvide:\n1. prioritizedActions: 4-6 actions (action, priority, timeline, gapReference)\n2. quickWins: 2-3 items (action, impact, effort)\n3. riskRegister: 3-5 risks (risk, likelihood, impact, mitigation)\n\nOutput JSON.` }] },
                    config: { responseMimeType: 'application/json', temperature: 0.2 }
                }), 2, 2000, 'Gap actions/risks');
                const actionsData = JSON.parse(tryRepairJson(actionsResp.text || '{}'));
                if (actionsData.prioritizedActions?.length > (analysis.prioritizedActions?.length || 0)) analysis.prioritizedActions = actionsData.prioritizedActions;
                if (actionsData.quickWins?.length > (analysis.quickWins?.length || 0)) analysis.quickWins = actionsData.quickWins;
                if (actionsData.riskRegister?.length > (analysis.riskRegister?.length || 0)) analysis.riskRegister = actionsData.riskRegister;
            } catch (e) { /* non-blocking */ }
        }

        // Validate
        const gapValidation = validateDeliverableOutput(gapResult, 'gap_analysis');
        if (!gapValidation.valid && !feedback) {
            console.log(`[Validation] ${gapValidation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${gapValidation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateGapAnalysis(gapValidation.failures.join('. '), onStream);
        }

        return gapResult;
    }

    async generateTechAudit(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('TECH_AUDIT'); } catch (e) { /* skill unavailable */ }

        // TWO-PHASE: Systems inventory first, then analysis.
        // Single-call approach truncates to 1 system due to output token limits.

        onStream("Phase A: Scanning for technology systems...");
        const inventoryPrompt = `${skillInstructions ? `=== AGENT SKILL: TECH AUDIT INSPECTOR ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}TECH AUDIT: SYSTEMS INVENTORY.
Research goal: "${this.goal}".

Scan the entire research corpus for EVERY mention of technology systems, software platforms, tools, databases, APIs, vendors, and digital processes. You MUST find at least 8 systems. If the research mentions any organization, they use technology — identify it.

LOOK FOR:
- CRM systems (Salesforce, HubSpot, Blackbaud, Raiser's Edge, Slate, etc.)
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
- citations: Array of source names where this system was mentioned (e.g., ["Client SOW", "Higher Ed Dive", "Reddit"])
- evidenceBasis: 1 sentence with specific evidence of this system's role or issues (e.g., "SOW mentions Raiser's Edge NXT as primary CRM but staff report 40% of data entry is manual")

Generate at LEAST 8 systems. If the corpus mentions an organization, that organization has a CRM, a website, email, databases, and likely an LMS — include them even if the specific vendor isn't named (label as "Unspecified CRM" etc.).
${feedback ? 'USER FEEDBACK: ' + feedback : ''}`;

        // Use standalone call to avoid chat context pollution
        const inventorySchema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                systems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                    name: { type: Type.STRING }, vendor: { type: Type.STRING }, category: { type: Type.STRING },
                    users: { type: Type.STRING }, department: { type: Type.STRING }, status: { type: Type.STRING },
                    citations: { type: Type.ARRAY, items: { type: Type.STRING } }, evidenceBasis: { type: Type.STRING }
                }, required: ["name", "category", "status", "citations", "evidenceBasis"] } }
            },
            required: ["methodology", "systems"]
        };
        const inventory = await this.executeStep<any>(inventoryPrompt, inventorySchema, [], onStream);
        const systems = inventory.systems || [];

        onStream(`Found ${systems.length} systems. Phase B: Analyzing integrations and capabilities...`);
        const analysisPrompt = `STEP: TECH AUDIT PHASE B — INTEGRATION & CAPABILITY ANALYSIS.
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

        const techAuditResult = {
            methodology: inventory.methodology,
            audit: {
                systemsInventory: systems,
                integrationMap: analysis.integrationMap || [],
                capabilityMatrix: analysis.capabilityMatrix || [],
                consolidationOpportunities: analysis.consolidationOpportunities || [],
                recommendations: analysis.recommendations || [],
            }
        };

        // Validate and auto-retry if evidence is thin
        const techAuditValidation = validateDeliverableOutput(techAuditResult, 'tech_audit');
        if (!techAuditValidation.valid && !feedback) {
            console.log(`[Validation] ${techAuditValidation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${techAuditValidation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateTechAudit(techAuditValidation.failures.join('. '), onStream);
        }

        return techAuditResult;
    }

    async generateCompetitiveAnalysis(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        let skillInstructions = '';
        try { const { loadSkillPrompt } = await import('./deliverableFrameworks'); skillInstructions = await loadSkillPrompt('COMPETITIVE_ANALYSIS'); } catch (e) { /* skill unavailable */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: COMPETITIVE ANALYST ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: COMPETITIVE & LANDSCAPE ANALYSIS. You are a senior industry analyst.

TWO ANALYSIS MODES — use BOTH:

MODE 1: NAMED ENTITIES — Extract every organization, vendor, platform, institution, or product mentioned BY NAME in the corpus.
  - Search ALL chunks for proper nouns: company names, university names, software products, vendors, government agencies
  - Example: If corpus mentions "Salesforce", "Blackbaud", "Stanford", "MIT" — these are peers/players
  - For each named entity found: name, role in the ecosystem, strengths (from evidence), weaknesses (from evidence)
  - MUST cite [CHUNK_XXX] for every claim about a named entity

MODE 2: ARCHETYPE ANALYSIS — When the corpus discusses TYPES of organizations rather than specific names:
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
  - dimension: Specific capability (NOT generic like "Technology" — say "AI-Powered Donor Engagement Maturity")
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
- Returning 0 peers (impossible — every corpus references organizations or organizational types)
- Generic industry context without evidence citations
- Maturity scores without justification
- Missing gap actions

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
                        evidenceBasis: { type: Type.STRING }
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
                }, required: ["industryContext", "peers", "benchmarkDimensions", "maturityMatrix", "gapSummary"] }
            },
            required: ["methodology", "analysis"]
        };
        const compResult = await this.executeStep<any>(prompt, schema, [], onStream);
        const analysis = compResult?.analysis || {};

        // Phase 2: Enrich thin peers + fill missing dimensions/matrix/gaps
        const peers = analysis.peers || [];
        const thinPeers = peers.filter((p: any) => !p.citations?.length || !p.evidenceBasis);
        if (thinPeers.length > 0) {
            onStream(`Enriching ${thinPeers.length} competitive peers with evidence...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            for (const peer of thinPeers) {
                try {
                    const enrichResp = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-2.5-flash',
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
                    model: 'gemini-2.5-flash',
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
            console.log(`[Validation] ${compValidation.failures.length} issues, auto-retrying...`);
            onStream(`Quality gate: ${compValidation.failures.slice(0, 3).join('; ')}. Retrying...`);
            return this.generateCompetitiveAnalysis(compValidation.failures.join('. '), onStream);
        }

        return compResult;
    }

    // ============================================================
    // STRATEGIC REPORT GENERATION (Report-First Architecture)
    // ============================================================

    /**
     * Generate a comprehensive strategic report synthesizing ALL deliverables.
     * This is the unrestricted narrative layer — no character budgets, no slide templates.
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
                const quote = c.text ? ` — "${c.text.substring(0, 100)}"` : '';
                return `${name}${quote}`;
            });
            return `Theme ${i+1}: ${t.name}\nDescription: ${resolveChunksInText(t.description)}\nQuote: "${t.quote}"\nCitations:\n${citations.map((c: string) => `  - ${c}`).join('\n')}\nCross-document: ${t.isCrossDocument ? 'Yes' : 'No'}\nStatus: ${t.status || 'approved'}`;
        }).join('\n\n');

        const serializePersonas = (personas: any[]) => personas.map(p =>
            `Persona: ${p.name} (${p.role})\nDemographics: ${p.demographics}\nBio: ${resolveChunksInText(p.bio)}\nJTBD: ${p.jtbd || 'N/A'}\nQuote: "${p.quote}"\nGoals: Life=${p.goals?.lifeGoal || 'N/A'} | Experience=${p.goals?.experienceGoal || 'N/A'} | Functional=${p.goals?.functionalGoal || 'N/A'}\n5Ws: Who=${resolveChunksInText(p.fiveWs?.who || 'N/A')} | What=${resolveChunksInText(p.fiveWs?.what || 'N/A')} | When/Where=${resolveChunksInText(p.fiveWs?.whenWhere || 'N/A')} | Why=${resolveChunksInText(p.fiveWs?.why || 'N/A')}\nPain Points: ${(p.painPoints || []).map((pp: any) => `${pp.label}: "${resolveChunksInText(pp.quote || '')}" (${resolveChunk(pp.sourceFile || pp.source || '')})`).join('; ')}\nMotivations: ${(p.motivations || []).map((m: any) => `${m.label}: "${resolveChunksInText(m.quote || '')}" (${resolveChunk(m.source || '')})`).join('; ')}\nOpportunities: ${(p.opportunities || []).map((o: any) => `${o.label}: "${resolveChunksInText(o.quote || '')}" (${resolveChunk(o.source || '')})`).join('; ')}\nBehaviors: ${resolveChunksInText(p.behaviors || 'N/A')}\nTechnology Usage: ${resolveChunksInText(p.technologyUsage || 'N/A')}\nJourney Context: ${resolveChunksInText(p.journeyContext || 'N/A')}\nDay in the Life: ${resolveChunksInText(p.dayInTheLife || 'N/A')}\nBrand Relationships: ${resolveChunksInText(p.brandRelationships || 'N/A')}\nDecision Process: ${resolveChunksInText(p.decisionProcess || 'N/A')}\nConfidence: ${p.confidenceLevel || 'N/A'} (${p.evidenceCount || 0} evidence items)\nImage: ${p.imageUrl ? 'Available' : 'None'}`
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

        // Build EVIDENCE CATALOG from raw sources — the actual articles, posts, and data
        // This is what makes the report cite real intelligence instead of just deliverable abstracts
        // CRITICAL: The knowledge graph shows ~200 sources with full depth because it reads raw data.
        // The report MUST see the same depth. Inject liberally — Gemini 2.5 Flash has 1M token context.
        let evidenceCatalog = '';
        if (rawSources && rawSources.length > 0) {
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
                    // INCLUDE ALL USER-CURATED ARTICLES — no hard caps.
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
                        if (item.priority) evidenceEntries.push(`  *** PRIORITY CITATION — User flagged this article for MANDATORY prominent placement in the report ***`);
                        totalArticlesInjected++;
                    }
                }
            }

            if (evidenceEntries.length > 0) {
                evidenceCatalog = `\n=== RAW INTELLIGENCE EVIDENCE (${totalArticlesInjected} articles injected from ${rawSources.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)} total collected across ${rawSources.length} sources) ===
THIS IS YOUR PRIMARY EVIDENCE BASE. The deliverables above are the AI's synthesis — but YOUR report must go DEEPER than the synthesis by citing the raw evidence directly.

MANDATORY EVIDENCE USAGE:
- CASE STUDIES: When an article describes a specific organization's experience, present it as a 2-3 sentence case study.
- VERBATIM SOCIAL EVIDENCE: Reddit posts, forum comments, and reviews are primary practitioner evidence. Quote them DIRECTLY with attribution: "One advancement director on Reddit wrote: '...'"
- ACADEMIC CITATIONS: Reference papers by title and author when available: "A 2024 OpenAlex study by Smith et al. found that..."
- DATA POINTS: Extract specific numbers, percentages, dates, dollar amounts from articles. "According to Higher Ed Dive, enrollment dropped 15% at 23 institutions in Q1 2025."
- CONVERGENT EVIDENCE: When multiple sources agree, explicitly note convergence: "This finding is corroborated by three independent sources: [source1], [source2], and [source3]."
- COUNTER-EVIDENCE: When sources disagree, note the tension: "While [source1] reports growth, [source2] documented contraction in the same segment."
- SOURCE NAMES: ALWAYS cite the source by its publication/platform name, never as "research" or "studies" or "intelligence sources."

${evidenceEntries.join('\n')}
=== END RAW INTELLIGENCE EVIDENCE ===\n`;
            }
        }

        const sourceCatalog = sourceNames.size > 0
            ? `\n=== SOURCE CATALOG (${sourceNames.size} sources — cite by name) ===\n${Array.from(sourceNames).map(s => `- ${s}`).join('\n')}\n=== END SOURCE CATALOG ===\n`
            : '';

        // Build the full deliverable context — NO TRUNCATION, RESOLVED CITATIONS
        const deliverableContext: string[] = [];
        if (context.themes?.length) deliverableContext.push(`=== THEMES (${context.themes.length}) ===\n${serializeThemes(context.themes)}`);
        if (context.personas?.length) deliverableContext.push(`=== PERSONAS (${context.personas.length}) ===\n${serializePersonas(context.personas)}`);
        if (context.journeyStages?.length) deliverableContext.push(`=== SERVICE BLUEPRINT (${context.journeyStages.length} stages) ===\n${serializeJourney(context.journeyStages)}`);
        if (context.recommendations?.length) deliverableContext.push(`=== RECOMMENDATIONS (${context.recommendations.length}) ===\n${serializeRecommendations(context.recommendations)}`);
        if (context.prd) deliverableContext.push(`=== PRD ===\n${serializePRD(context.prd)}`);
        if (context.roadmap) deliverableContext.push(`=== ROADMAP ===\n${serializeRoadmap(context.roadmap)}`);
        if (context.techArchitecture) deliverableContext.push(`=== TECH ARCHITECTURE ===\n${serializeTechArch(context.techArchitecture)}`);
        if (context.gapAnalysis) deliverableContext.push(`=== GAP ANALYSIS ===\n${serializeGapAnalysis(context.gapAnalysis)}`);
        if (context.techAudit) deliverableContext.push(`=== TECH ECOSYSTEM AUDIT ===\n${serializeTechAudit(context.techAudit)}`);
        if (context.competitiveAnalysis) deliverableContext.push(`=== COMPETITIVE ANALYSIS ===\n${serializeCompetitive(context.competitiveAnalysis)}`);

        // Load wiki constraints for self-improvement
        let learnedConstraints = '';
        try {
            const { getActiveConstraints } = await import('./promptImprovementEngine');
            learnedConstraints = getActiveConstraints();
        } catch (e) { /* no constraints available */ }

        const prompt = `${skillInstructions ? `=== AGENT SKILL: STRATEGIC REPORT WRITER ===\n${skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: STRATEGIC REPORT. You are a McKinsey-trained strategy consultant writing a comprehensive research report.

TASK: Synthesize ALL of the deliverable data below into a unified strategic whitepaper. The report must introduce and contextualize EVERY deliverable generated in this research — themes, personas, journey map, gap analysis, competitive positioning, technology audit, recommendations, PRD, roadmap, and architecture. Each deliverable gets its own section with deep evidence. This report will later be distilled into a strategy deck — so be thorough, evidence-rich, and citation-heavy. Write with unrestricted analytical depth.

RUMELT'S KERNEL (the report must contain all three):
1. DIAGNOSIS: ONE specific challenge grounded in evidence from multiple deliverables.
2. GUIDING POLICY: ONE strategic choice that excludes alternatives.
3. COHERENT ACTIONS: 5-7 actions that reinforce each other, drawn from recommendations and roadmap.

NARRATIVE STRUCTURE (McKinsey Whitepaper Format):
- Executive Summary: 500-800 words in SCR format. State the conclusion first. Reference at least 5 distinct intelligence sources.
- Each section: 400-800 words of analytical prose that reads like a published research report.
- WRITE LIKE A JOURNALIST: Name specific articles, quote specific people, cite specific data. "According to a February 2025 Higher Ed Dive report..." not "according to research."
- USE CASE STUDIES: When an article describes a real institution, company, or person's experience, present it as a 2-3 sentence case study. "Amazon's January 2024 layoff of 16,000 corporate employees, reported across multiple Reddit communities, illustrates the volatility facing graduates..."
- CITE SOCIAL EVIDENCE: Reddit posts and community discussions are primary practitioner evidence. Quote them directly: "One CS student on r/cscareerquestions wrote: 'I applied to 200 positions...' — a sentiment echoed by 47 similar posts in the dataset."
- WEAVE MULTIPLE SOURCES: Each paragraph should reference 2-3 different sources, showing convergent evidence. "Federal Register data confirms the regulatory shift, while a Hechinger Report investigation revealed the implementation gap at ground level."
- Every factual claim MUST cite its source by specific name (not "research shows" or "studies indicate").
- Include keyMetrics (label, value, context) with specific numbers from the evidence for EVERY section.
- Include keyQuote (text, attribution, source) with a VERBATIM quote from a named source for EVERY section.
- Flag evidenceGap when a section relies on thin or single-source evidence.

PRIORITY CITATION ENFORCEMENT:
Articles marked with "*** PRIORITY CITATION ***" in the evidence catalog below were explicitly flagged by the user for prominent placement. You MUST:
1. Cite EVERY priority-flagged article by name in the report
2. Include a direct quote or specific data point from each priority article
3. Place priority articles in the most relevant section — they should anchor the argument, not be footnotes
4. If a priority article doesn't fit any section naturally, create a "Notable Evidence" subsection

MANDATORY SECTION MANIFEST (generate EXACTLY these sections in this order — do NOT substitute strategy-document boilerplate like "Vision", "Governance Model", "Communication Plan"):
${(() => {
    const sections: string[] = [];
    let n = 1;
    sections.push(`${n++}. EXECUTIVE SUMMARY (sourceDeliverable: "executive_summary") — 500-800 words synthesizing the entire research body. Must reference at least 5 intelligence sources by name.`);
    if (context.themes?.length) {
        sections.push(`${n++}. RESEARCH LANDSCAPE: KEY THEMES (sourceDeliverable: "themes") — Present the ${context.themes.length} research themes as findings, each grounded in specific evidence. Name the articles and data that support each theme. This is NOT a strategy section — it's a research findings section.`);
        sections.push(`${n++}. THEME DEEP-DIVE: [Pick the highest-evidence theme] (sourceDeliverable: "themes") — 600+ words investigating the strongest theme in depth. Use case studies, quote articles, cite data. Show convergent evidence across multiple sources.`);
    }
    if (context.personas?.length) {
        for (const p of context.personas.slice(0, 4)) {
            sections.push(`${n++}. PERSONA: ${p.name} (sourceDeliverable: "personas") — Full persona profile as investigative narrative. Include JTBD, Cooper goals, pain points with quoted evidence, behaviors, technology usage, journey context, day-in-the-life. Write as if profiling a real person for a magazine article. Cite the specific sources that informed this persona.`);
        }
    }
    if (context.journeyStages?.length) {
        sections.push(`${n++}. SERVICE JOURNEY ANALYSIS (sourceDeliverable: "journey_map") — Walk through ALL ${context.journeyStages.length} journey stages. For each stage: what happens, what fails, what the emotional experience is, where the moments of truth are. Name specific pain points with evidence. Include frontstage/backstage actions.`);
        sections.push(`${n++}. MOMENTS OF TRUTH & FAILURE POINTS (sourceDeliverable: "journey_map") — Focus on the stages with fail_points and momentOfTruth=true. Describe what breaks, the consequences, and the evidence. Use specific data from the research.`);
    }
    if (context.gapAnalysis) {
        sections.push(`${n++}. CAPABILITY GAP ASSESSMENT (sourceDeliverable: "gap_analysis") — Present ALL gaps with current/target maturity scores. Include the risk register. Cite evidence for each gap's impact. Show the maturity progression path.`);
    }
    if (context.competitiveAnalysis) {
        sections.push(`${n++}. COMPETITIVE POSITIONING (sourceDeliverable: "competitive_analysis") — Present ALL peers with strengths/weaknesses/differentiators. Include the maturity matrix scores. Show where we lead and where we trail. Cite specific competitive intelligence.`);
    }
    if (context.techAudit) {
        sections.push(`${n++}. TECHNOLOGY ECOSYSTEM (sourceDeliverable: "tech_audit") — Present the systems inventory, integration map, and capability matrix. Name specific systems, vendors, health statuses. Identify consolidation opportunities with evidence.`);
    }
    if (context.recommendations?.length) {
        sections.push(`${n++}. STRATEGIC RECOMMENDATIONS (sourceDeliverable: "recommendations") — Present ALL ${context.recommendations.length} recommendations with full action items. Each recommendation must cite the evidence that justifies it. Group by impact level.`);
    }
    if (context.prd) {
        sections.push(`${n++}. PRODUCT REQUIREMENTS (sourceDeliverable: "prd") — Present key features with MoSCoW priority, user stories, and acceptance criteria. Tie each feature back to a persona need or gap finding.`);
    }
    if (context.roadmap) {
        sections.push(`${n++}. IMPLEMENTATION ROADMAP (sourceDeliverable: "roadmap") — Present ALL items across NOW/NEXT/LATER horizons with owners, success metrics, and dependencies. Each item must reference the recommendation or gap it addresses.`);
    }
    if (context.techArchitecture) {
        sections.push(`${n++}. ARCHITECTURE DIRECTION (sourceDeliverable: "tech_architecture") — Present the technical architecture with nodes, flows, and integration points. Tie to the tech audit findings and gap analysis.`);
    }
    sections.push(`${n++}. RISK ASSESSMENT & QUICK WINS (sourceDeliverable: "risk_assessment") — Top 5 risks from the gap analysis risk register + the top quick wins from the roadmap NOW horizon. Evidence-grounded, not generic.`);
    return sections.join('\n');
})()}

TOTAL: Generate ALL sections listed above. Do NOT skip any. Do NOT add sections not in this list (no "Vision and Mission", "Governance Model", "Communication Plan", "Change Management" — those are strategy document filler, not research report content).

ANTI-SLOP: No "paradigm shift", "game-changer", "leverage synergies", "in today's rapidly evolving landscape", or similar corporate filler. Write like a consultant who bills $500/hour — every word earns its place.

PLAIN TEXT ONLY: No **bold**, *italic*, or markdown. The rendering system handles formatting.

${learnedConstraints ? `\nLEARNED CONSTRAINTS (from prior user feedback):\n${learnedConstraints}\n` : ''}
${feedback ? `\nUSER FEEDBACK (PRIORITY):\n${feedback}\n` : ''}

=== DELIVERABLE DATA (use ALL of this) ===
${deliverableContext.join('\n\n')}
=== END DELIVERABLE DATA ===
${evidenceCatalog}
${sourceCatalog}
CRITICAL CITATION AND EVIDENCE REQUIREMENTS:
1. The RAW INTELLIGENCE EVIDENCE section above contains articles from ${rawSources?.length || 0} sources with ${rawSources?.reduce((s: number, r: any) => s + (r.items?.length || 0), 0) || 0} total collected items. THIS IS YOUR PRIMARY EVIDENCE BASE — the knowledge graph shows all this depth and YOUR REPORT MUST MATCH IT.
2. Your report MUST cite evidence from at LEAST 20 different named sources — not just the uploaded client documents. The knowledge graph connects ~200 evidence nodes; your report should reference a significant fraction of them.
3. CITE SPECIFIC ARTICLES BY NAME: "According to Higher Ed Dive's article 'Universities Struggle with Skills Gap'..." or "A Reddit post in r/cscareerquestions noted that..."
4. QUOTE SPECIFIC DATA: Use specific statistics, dates, percentages, dollar amounts, and findings from the evidence articles. NEVER generalize what can be specified. BAD: "Research shows enrollment declined." GOOD: "Higher Ed Dive reported a 15% enrollment decline across 23 public universities in Q1 2025, with rural institutions hit hardest at 22% [Higher Ed Dive]."
5. USE CASE STUDY FORMAT: When an article describes a specific institution's experience, present it as a 2-4 sentence case study within the relevant section. MINIMUM 3 case studies across the report. Example: "CASE STUDY: Southern Oregon University received a $15M state lifeline in March 2025 to maintain operations after enrollment dropped below sustainability thresholds. The investment, paired with a workforce-aligned curriculum redesign, is projected to recover 60% of lost enrollment within 18 months [GDELT News]."
6. SOCIAL EVIDENCE IS PRIMARY EVIDENCE: Reddit posts, forum discussions, TrustPilot reviews, and community data are unfiltered practitioner voices. Quote them DIRECTLY and EXTENSIVELY: "A senior advancement officer wrote on r/highereducation: 'We've been doing the same thing for 20 years and wondering why young alumni don't give' — a sentiment echoed in 14 similar posts across the dataset."
7. The uploaded client documents provide ORGANIZATIONAL CONTEXT. The intelligence sources provide EXTERNAL EVIDENCE. Every section must weave BOTH: what the client's documents say about their situation + what the broader evidence reveals about the landscape they operate in.
8. Each section's "citations" array must list 5-10 ACTUAL source names (e.g., "Higher Ed Dive", "OpenAlex", "Reddit: r/cscareerquestions", "Semantic Scholar: Smith 2024") — NEVER generic references like "intelligence_sources" or "CHUNK_XXX" or "research data."
9. EVERY section must include keyMetrics with 2-4 specific numbers drawn from the evidence (not approximations), and keyQuote with a VERBATIM quote from a named source.
10. If a section relies only on uploaded client documents with no external evidence, flag it as an evidenceGap.
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

        // PHASE 1: Generate executive summary + diagnosis + pillars in the chat session
        onStream('Phase 1: Generating executive framework (diagnosis, pillars, summary)...');
        const frameworkResult = await this.executeStep<any>(prompt, schema, [], onStream);

        // Extract the framework from Phase 1
        const report = frameworkResult?.report || {};
        const executiveSummary = report.executiveSummary || '';
        const diagnosis = report.diagnosis || '';
        const guidingPolicy = report.guidingPolicy || '';
        const strategicPillars = report.strategicPillars || [];
        const phase1Sections = report.sections || [];

        // PHASE 2: Generate REMAINING sections individually via standalone calls
        // The Phase 1 call may have generated some sections but often runs out of tokens.
        // We generate each missing section with a dedicated call that receives ONLY
        // the relevant deliverable data + the executive summary as context anchor.
        const sectionManifest: { title: string; sourceDeliverable: string; data: string }[] = [];

        if (context.personas?.length) {
            for (const p of context.personas.slice(0, 4)) {
                sectionManifest.push({
                    title: `PERSONA: ${p.name}`,
                    sourceDeliverable: 'personas',
                    data: serializePersonas([p])
                });
            }
        }
        if (context.journeyStages?.length) {
            sectionManifest.push({ title: 'SERVICE JOURNEY ANALYSIS', sourceDeliverable: 'journey_map', data: serializeJourney(context.journeyStages) });
        }
        if (context.gapAnalysis) {
            sectionManifest.push({ title: 'CAPABILITY GAP ASSESSMENT', sourceDeliverable: 'gap_analysis', data: serializeGapAnalysis(context.gapAnalysis) });
        }
        if (context.competitiveAnalysis) {
            sectionManifest.push({ title: 'COMPETITIVE POSITIONING', sourceDeliverable: 'competitive_analysis', data: serializeCompetitive(context.competitiveAnalysis) });
        }
        if (context.techAudit) {
            sectionManifest.push({ title: 'TECHNOLOGY ECOSYSTEM', sourceDeliverable: 'tech_audit', data: serializeTechAudit(context.techAudit) });
        }
        if (context.recommendations?.length) {
            sectionManifest.push({ title: 'STRATEGIC RECOMMENDATIONS', sourceDeliverable: 'recommendations', data: serializeRecommendations(context.recommendations) });
        }
        if (context.prd) {
            sectionManifest.push({ title: 'PRODUCT REQUIREMENTS', sourceDeliverable: 'prd', data: serializePRD(context.prd) });
        }
        if (context.roadmap) {
            sectionManifest.push({ title: 'IMPLEMENTATION ROADMAP', sourceDeliverable: 'roadmap', data: serializeRoadmap(context.roadmap) });
        }
        if (context.techArchitecture) {
            sectionManifest.push({ title: 'ARCHITECTURE DIRECTION', sourceDeliverable: 'tech_architecture', data: serializeTechArch(context.techArchitecture) });
        }

        // Check which sections Phase 1 already generated
        const generatedDeliverables = new Set(phase1Sections.map((s: any) => s.sourceDeliverable));
        const missingSections = sectionManifest.filter(s => !generatedDeliverables.has(s.sourceDeliverable));

        if (missingSections.length > 0) {
            onStream(`Phase 2: Generating ${missingSections.length} remaining sections individually...`);
            const standaloneAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const sectionSchema: any = {
                type: 'OBJECT',
                properties: {
                    sectionNumber: { type: 'INTEGER' },
                    title: { type: 'STRING' },
                    content: { type: 'STRING' },
                    sourceDeliverable: { type: 'STRING' },
                    citations: { type: 'ARRAY', items: { type: 'STRING' } },
                    keyMetrics: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, value: { type: 'STRING' }, context: { type: 'STRING' } }, required: ['label', 'value'] } },
                    keyQuote: { type: 'OBJECT', properties: { text: { type: 'STRING' }, attribution: { type: 'STRING' }, source: { type: 'STRING' } } },
                    evidenceGap: { type: 'STRING' },
                },
                required: ['sectionNumber', 'title', 'content', 'sourceDeliverable', 'citations']
            };

            let sectionNum = phase1Sections.length + 1;
            for (const manifest of missingSections) {
                onStream(`Writing section: ${manifest.title}...`);
                const sectionPrompt = `You are a McKinsey-trained strategy consultant writing ONE section of a strategic research report.

CONTEXT (the report's executive framework):
DIAGNOSIS: ${diagnosis}
GUIDING POLICY: ${guidingPolicy}
PILLARS: ${strategicPillars.join('; ')}

YOUR TASK: Write section "${manifest.title}" (sourceDeliverable: "${manifest.sourceDeliverable}").

THIS SECTION MUST:
1. Be 400-800 words of analytical prose — NOT bullet points, NOT a summary
2. INTRODUCE and CONTEXTUALIZE the deliverable: explain what this analysis IS, what methodology was used, and what it reveals about the research subject
3. Include keyMetrics (2-4 specific numbers from the data)
4. Include a keyQuote (verbatim from a named source)
5. Include 5-10 citations (real source names, not "research" or "studies")
6. Lead with EXTERNAL research evidence, then contextualize with client documents
7. If this is a persona section, write as an investigative profile — tell their story with evidence
8. If this is a journey section, walk through each stage with what breaks and why
9. If this is a gap/competitive/audit section, present findings with maturity scores and evidence

DELIVERABLE DATA:
${manifest.data}

${evidenceCatalog ? 'EVIDENCE CATALOG (cite from this):\n' + evidenceCatalog.substring(0, 30000) : ''}

PLAIN TEXT ONLY. No markdown. No bullet lists unless the data is inherently a list.
Output JSON matching the section schema.`;

                try {
                    const sectionResponse = await withRetry(() => standaloneAi.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: [{ text: sectionPrompt }] },
                        config: { responseMimeType: 'application/json', responseSchema: sectionSchema, temperature: 0.3 }
                    }), 3, 3000, `Report Section: ${manifest.title}`);

                    const sectionText = sectionResponse.text || '{}';
                    const section = JSON.parse(tryRepairJson(sectionText));
                    section.sectionNumber = sectionNum++;
                    section.sourceDeliverable = manifest.sourceDeliverable;
                    phase1Sections.push(section);
                } catch (e) {
                    console.warn(`[StrategicReport] Failed to generate section "${manifest.title}":`, e);
                    // Create stub section so the report isn't missing it entirely
                    phase1Sections.push({
                        sectionNumber: sectionNum++,
                        title: manifest.title,
                        content: `This section could not be generated. The ${manifest.sourceDeliverable} deliverable data is available for review in the corresponding output tab.`,
                        sourceDeliverable: manifest.sourceDeliverable,
                        citations: [],
                        evidenceGap: 'Section generation failed — review deliverable directly.'
                    });
                }
            }
        }

        // Assemble final report
        report.sections = phase1Sections;
        onStream(`Strategic Report complete: ${phase1Sections.length} sections generated.`);
        return { methodology: frameworkResult?.methodology || '', report };
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

    private async executeStep<T>(prompt: string, schema: Schema, parts: any[] = [], onStream: (t: string) => void): Promise<T> {
        // Retry the entire step (including streaming) to handle mid-stream network failures
        // like ERR_NETWORK_CHANGED, which kill the stream after sendMessageStream succeeds
        const MAX_STEP_RETRIES = 5;
        let lastError: any;

        for (let attempt = 0; attempt < MAX_STEP_RETRIES; attempt++) {
            try {
                const result = await withRetry<any>(() => this.chatSession.sendMessageStream({
                    message: [...parts, { text: prompt }],
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
                                        break; // Stop reading the stream
                                    }
                                }
                            }
                        }
                    }
                } catch (streamError: any) {
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
                    return parsed;
                } catch (e) {
                    console.error("Critical JSON Parse Error", e, "Raw:", cleanedText.substring(0, 100) + "...");
                    throw new Error(`Failed to parse Gemini response: ${e instanceof Error ? e.message : 'Unknown Error'}`);
                }
            } catch (stepError: any) {
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
 * Post-generation validation — ports hook logic into the pipeline.
 * Returns { valid: boolean, failures: string[] }.
 * When valid is false, the pipeline should retry with failures as feedback.
 */
export function validateDeliverableOutput(
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

    // CHECK 3: Walk citations arrays — no empty, no generic
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
