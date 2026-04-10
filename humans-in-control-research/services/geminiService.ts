
import { GoogleGenAI, Type, Schema, Chat, GenerateContentResponse } from "@google/genai";
import { FileUpload, AnalysisResult, Persona, ScriptScene, Slide, SlideLayout, StepResult_Ingestion, StepResult_Themes, StepResult_Personas, StepResult_Structure, StepResult_Narrative, StepResult_Final, Theme, SlideStyle, Citation, StrategicRecommendation, OutputOption, StepResult_JourneyMap, StepResult_TechArch, ServiceBlueprintStage, TechnicalArchitecture, TechNode, TechFlow, PRD, StepResult_PRD, StrategicRoadmap, StepResult_Roadmap, StepResult_Recommendations } from "../types";
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
            
            if (isTransient && i < retries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`${operationName} failed with ${error.status || error.code || 'error'}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
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

export const generateImage = async (prompt: string, aspectRatio: string = "16:9", refImageBase64?: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Import style system
    const { getStyleById } = await import('./visualizationStyles');
    const style = getStyleById(_activeVisStyleId);

    // Determine context from aspect ratio
    const context = (aspectRatio === "1:1" || aspectRatio === "3:4") ? 'portrait' : 'scene';
    const styleBase = style.promptBase[context];
    const negativeConstraints = style.negativeConstraints;

    const finalPrompt = `${styleBase}. Depict specifically: ${prompt}. Ensure all visual elements relate to this description. ${negativeConstraints}`; 

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
      model: 'gemini-2.5-flash-image', // Switched to stable model
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          // imageSize removed as it is not supported by 2.5-flash-image
        }
      }
    }), 3, 2000, "Image Generation");

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

    constructor(goal: string, approach: string, selectedOutputs: OutputOption[] = [], lensPromptSegment: string = '') {
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
                'PERSONAS': 'PERSONAS', 'STRATEGY_DECK': 'DECK_STRUCTURE', 'VIDEO_SCRIPT': 'DECK_NARRATIVE',
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

        let roleDefinition = "an elite CX consulting partner (McKinsey/BCG/IDEO caliber)";
        let specificFocus = "";

        const systemInstruction = `
            You are ${roleDefinition} powered by advanced AI.

            CORE OBJECTIVE: Produce consulting-grade deliverables from research evidence.
            RESEARCH GOAL: "${this.goal}"
            ANALYSIS APPROACH: "${this.approach}"
            ${specificFocus}
            ${lensPromptSegment}
            ${frameworkInstructions}

            STRICT CONSTRAINTS TO PREVENT JSON ERRORS:
            - BE EXTREMELY CONCISE. Long responses cause parsing errors.
            - "summary" and "description" fields must not exceed 60 words.
            - Bullet points must not exceed 20 words each.
            - Bio fields must not exceed 80 words.
            - ALWAYS output valid JSON inside markdown code blocks.

            CRITICAL TRANSPARENCY AND CITATION RULES:
            - Streaming Reasoning: For every step, output a "methodology" string inside the JSON object.
            - Include [PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT] tags in the methodology.
            - CITATION REQUIREMENT: Every factual claim MUST cite its source using [CHUNK_XXX] format.
            - The research corpus contains items tagged as [CHUNK_001], [CHUNK_002], etc.
            - When generating themes: include "citations": ["CHUNK_001", "CHUNK_005"] in each theme object.
            - When generating persona pain points: cite the specific chunk that evidences each pain point.
            - When generating recommendations: cite the chunks that support each recommendation.
            - If a claim cannot be traced to a specific chunk, prefix it with "[No direct source]".
            - Prioritize claims from Tier 1 sources (peer-reviewed, government) over Tier 3 (community).
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
        const prompt = `SYSTEM UPDATE: The user has MANUALLY EDITED the ${contextLabel}. Use the following JSON as ground truth for future steps: \n\n ${JSON.stringify(data)}`;
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
            const isSupportedInline = mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('audio/') || mimeType.startsWith('video/');
            const isTextBased = (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/csv' || ['txt', 'md', 'json', 'csv'].includes(extension || '')) && !['doc', 'docx', 'pdf', 'bin', 'zip', 'exe'].includes(extension || '');

            if (isTextBased) { 
                try {
                    fileParts.push({ text: atob(file.data) });
                } catch (e) {
                    fileParts.push({ text: `[Error: Content omitted]` });
                }
            } else if (isSupportedInline) {
                fileParts.push({ inlineData: { mimeType: file.type, data: file.data } });
            } else {
                fileParts.push({ text: `[Unsupported file type: ${file.name}]` });
            }
        });

        const prompt = `STEP 1: INGESTION. Summarize the research context. Identify stakeholders. Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                summary: { type: Type.STRING },
                dataTypesIdentified: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyStakeholders: { type: Type.ARRAY, items: { type: Type.STRING } },
                documents: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fileName: { type: Type.STRING }, author: { type: Type.STRING }, publicationDate: { type: Type.STRING } } } },
                confidenceScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING }
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
        const prompt = `STEP 2: STRATEGIC THEME EXTRACTION. You are a senior research analyst performing rigorous thematic analysis.

METHODOLOGY: Perform MULTI-DIMENSIONAL thematic analysis across these 6 lenses simultaneously. Every lens MUST produce at least 1 theme if ANY evidence exists:

1. POLICY & REGULATORY: Government actions, legislation, compliance requirements, regulatory shifts
2. TECHNOLOGY & INNOVATION: Tools, platforms, AI adoption, digital transformation, emerging tech
3. FINANCIAL & ECONOMIC: Funding, budgets, revenue models, costs, economic trends, ROI
4. STAKEHOLDER & HUMAN: People impacts, workforce, demographics, equity, culture, sentiment
5. STRATEGIC & COMPETITIVE: Market position, competition, partnerships, differentiation, growth
6. OPERATIONAL & PROCESS: Workflows, efficiency, service delivery, infrastructure, best practices

EXTRACTION RULES:
- Analyze EVERY chunk in the corpus. Do not stop after finding the first theme.
- Each chunk may support MULTIPLE themes. A single source can contribute to 3-5 themes.
- Name themes specifically (BAD: "Technology". GOOD: "AI-Powered Donor Matching Platforms Reshape Fundraising")
- Description: 3-5 sentences with specific data points, statistics, names, dates from the evidence
- Minimum: Generate at least 5 themes. If the corpus has 20+ chunks, generate 8-15 themes.
- Maximum: No cap. If the evidence supports 20 themes, generate 20.
- Mark each theme as "priority" (strong evidence), "emerging" (moderate), or "weak" (limited evidence)

CITATION REQUIREMENTS (non-negotiable):
- Each theme MUST cite 2+ chunks. Single-source themes must be marked status: "weak"
- "sourceFile" = CHUNK ID (e.g. "CHUNK_001") from corpus
- "text" = VERBATIM quote from that chunk (10-30 words, copy-pasted exactly)
- "url" = URL from the chunk metadata (appears after "URL:" in chunk header)
- "sourceName" = source name from the SOURCE header (e.g. "Higher Ed Dive", "OpenAlex")
- "author" = author if present, empty string otherwise
- "publicationDate" = date from "Date:" line, empty string otherwise
- "quote" = the single BEST direct quote exemplifying this theme (with chunk reference)
- "isCrossDocument" = true if evidence spans 2+ different source names

ANTI-PATTERNS (these will be rejected):
- Generating only 1-2 themes from a corpus with 10+ chunks
- Generic theme names without specificity
- Descriptions that don't cite specific evidence
- Missing URLs when the chunk clearly has one

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
        return result;
    }

    async generatePersonas(themesInput: any | undefined, feedback: string | undefined, onStream: (t: string) => void, onStatus: (s: string) => void): Promise<StepResult_Personas> {
        const prompt = `STEP 3: PERSONA ARCHETYPES. You are an expert ethnographic researcher performing archetype analysis.

METHODOLOGY: Analyze ALL themes, ALL cited evidence, and ALL source material to identify EVERY DISTINCT stakeholder archetype present in the data. Do not settle for 1-2 generic personas. Look for:
- Different ROLES (executive, practitioner, beneficiary, policymaker, donor, student, alumni)
- Different PERSPECTIVES (optimist vs skeptic, innovator vs traditionalist)
- Different CONTEXTS (large vs small institution, public vs private, domestic vs international)
- Different SEGMENTS (individual donor, corporate partner, foundation, government funder)

REQUIREMENTS:
- Generate as many distinct persona archetypes as the data supports. Every distinct stakeholder perspective, role, or segment evidenced in the research should get its own persona. Typical corpora yield 4-8 personas, but generate more if the data supports more.
- Each persona MUST be grounded in specific evidence from the corpus
- "quote" = a first-person synthetic voice quote (what this person would say), 15-25 words
- "bio" = 2-3 sentences with [CHUNK_XXX] citations referencing specific corpus evidence
- Each motivation must have a "quote" with a DIRECT QUOTE from corpus + chunk reference
- Each pain point must have a "quote" with a DIRECT QUOTE from corpus + chunk reference
- Each opportunity must have a "quote" with evidence from corpus
- "fiveWs" must be filled: who (their world/network), what (tension they face), whenWhere (context), why (deeper motivation)
- Include ALL evidenced motivations, tasks, pain points, and opportunities per persona — do not cap at an arbitrary number. Let the research evidence determine the count.
- Each persona should connect to DIFFERENT themes -- not all personas about the same theme

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                personas: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            role: { type: Type.STRING },
                            demographics: { type: Type.STRING },
                            quote: { type: Type.STRING },
                            bio: { type: Type.STRING },
                            fiveWs: { type: Type.OBJECT, properties: { who: {type:Type.STRING}, what: {type:Type.STRING}, whenWhere: {type:Type.STRING}, why: {type:Type.STRING} } },
                            motivations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, quote: { type: Type.STRING }, citation: { type: Type.OBJECT, properties: { sourceFile: {type:Type.STRING}, text: {type:Type.STRING}, url: {type:Type.STRING}, sourceName: {type:Type.STRING} } } } } },
                            tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, quote: { type: Type.STRING } } } },
                            painPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, quote: { type: Type.STRING }, citation: { type: Type.OBJECT, properties: { sourceFile: {type:Type.STRING}, text: {type:Type.STRING}, url: {type:Type.STRING}, sourceName: {type:Type.STRING} } } } } },
                            opportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, quote: { type: Type.STRING }, citation: { type: Type.OBJECT, properties: { sourceFile: {type:Type.STRING}, text: {type:Type.STRING}, url: {type:Type.STRING}, sourceName: {type:Type.STRING} } } } } },
                        },
                        required: ["name", "role", "demographics", "quote", "bio", "fiveWs", "motivations", "painPoints", "opportunities"]
                    }
                }
            },
            required: ["methodology", "personas"]
        };

        const result = await this.executeStep<StepResult_Personas>(prompt, schema, [], onStream);
        
        // Ensure array safety before iteration
        if (!result.personas) result.personas = [];
        
        onStatus("Visualizing Personas...");
        // Sequential generation to avoid quota limits
        const personasWithImages = [];
        for (const p of result.personas) {
             onStatus(`Visualizing ${p.name}...`);
             const url = await generateImage(`Portrait of ${p.name}, ${p.role}. ${p.bio || ''}`, "1:1");
             personasWithImages.push({ ...p, imageUrl: url });
        }
        return { ...result, personas: personasWithImages };
    }

    async generateRecommendations(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Recommendations> {
        const prompt = `STEP: STRATEGIC RECOMMENDATIONS. You are a senior management consultant performing problem-solution mapping.

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
                            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } } 
                        },
                        required: ["title", "description", "impactLevel", "actionItems"]
                    } 
                }
            },
            required: ["methodology", "recommendations"]
        };
        const result = await this.executeStep<StepResult_Recommendations>(prompt, schema, [], onStream);
        if (!result.recommendations) result.recommendations = [];
        // Ensure actionItems exist
        result.recommendations.forEach(r => {
            if (!r.actionItems) r.actionItems = [];
        });
        return result;
    }

    async generateJourneyMap(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_JourneyMap> {
        const prompt = `STEP: PERSONA-DRIVEN SERVICE BLUEPRINT. You are a senior service designer creating an evidence-based, persona-aware service blueprint.

CRITICAL: This blueprint must map how EACH PERSONA (identified in Step 3) experiences the service differently. A university president navigates the journey differently than a frontline fundraiser or a donor.

METHODOLOGY:
1. Review ALL personas from Step 3 — their roles, pain points, motivations, and tasks
2. Map 5-8 chronological STAGES of the service lifecycle
3. For EACH stage, document how EACH actor (persona) experiences that stage differently

STAGE IDENTIFICATION:
- 5-8 stages covering the FULL lifecycle specific to the research context
- Name stages specifically (BAD: "Discovery". GOOD: "Donor Prospect Identification & Initial Outreach")

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
                    momentOfTruth: { type: Type.BOOLEAN }
                }, required: ["phase", "actors", "actorNeeds", "actorBehaviors", "customerAction", "touchpoint", "frontstageAction", "backstageAction", "supportProcesses", "physicalEvidence", "emotion", "painPoint", "opportunityForImprovement", "valueProposition", "momentOfTruth"] } }
            },
            required: ["methodology", "stages"]
        };
        const result = await this.executeStep<StepResult_JourneyMap>(prompt, schema, [], onStream);
        if (!result.stages) result.stages = [];
        
        if (result.stages.length > 0) {
            result.diagramUrl = await generateImage(`High-Fidelity 3D Isometric Service Blueprint Visualization. Glassmorphism data nodes, clean professional white background, corporate color palette (Deep Blue/Teal). Not flat.`, "16:9");
        }
        return result;
    }

    async generatePRD(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_PRD> {
        const prompt = `STEP: PRODUCT REQUIREMENTS DOCUMENT. You are a senior product manager translating research insights into actionable requirements.

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

ANTI-PATTERNS:
- Generic product names with version hashes
- Features not traceable to research evidence
- Missing acceptance criteria

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                prd: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, purposeAndObjectives: { type: Type.STRING }, successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } }, features: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, priority: { type: Type.STRING }, description: { type: Type.STRING }, acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["name", "priority", "description"] } } }, required: ["title", "purposeAndObjectives", "successMetrics", "features"] }
            },
            required: ["methodology", "prd"]
        };
        const result = await this.executeStep<StepResult_PRD>(prompt, schema, [], onStream);
        if (!result.prd) result.prd = { title: "Untitled", purposeAndObjectives: "", features: [] } as any;
        if (!result.prd.features) result.prd.features = [];
        return result;
    }

    async generateRoadmap(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Roadmap> {
        const prompt = `STEP: STRATEGIC ROADMAP. You are a strategy consultant creating an evidence-based implementation roadmap.

VISION: 2-3 sentences describing the desired future state, grounded in research themes. What does success look like in 12-18 months?

HORIZON FRAMEWORK:
- NOW (0-3 months): Quick wins and critical fixes identified in the research. These address the most urgent pain points.
- NEXT (3-9 months): Strategic initiatives that require planning and resources. Build on NOW foundations.
- LATER (9-18 months): Transformative changes that require organizational readiness.

FOR EACH INITIATIVE:
- initiative: Specific, action-oriented name (NOT "Improve processes" — say "Deploy AI-powered donor matching to replace manual prospect research")
- horizon: "Now" | "Next" | "Later"
- owner: The role/team responsible (e.g., "VP of Advancement", "IT Department", "Student Services Director")
- description: 30-50 words explaining WHAT, WHY (cite evidence [CHUNK_XXX]), and expected IMPACT
- dependencies: What must happen first (reference other initiatives by name)
- successMetric: How to measure completion/impact

REQUIREMENTS:
- Generate initiatives for EVERY strategic recommendation from previous steps
- Each initiative must trace to a specific theme or recommendation
- NOW horizon must include at least 2 quick wins from the research
- Balance across personas — don't over-index on one stakeholder group
- Include at least 1 initiative per persona archetype identified

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                roadmap: { type: Type.OBJECT, properties: { vision: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { initiative: { type: Type.STRING }, horizon: { type: Type.STRING }, owner: { type: Type.STRING }, description: { type: Type.STRING }, dependencies: { type: Type.STRING }, successMetric: { type: Type.STRING } }, required: ["initiative", "horizon", "owner", "description"] } } }, required: ["vision", "items"] }
            },
            required: ["methodology", "roadmap"]
        };
        const result = await this.executeStep<StepResult_Roadmap>(prompt, schema, [], onStream);
        if (!result.roadmap) result.roadmap = { vision: "", items: [] } as any;
        if (!result.roadmap.items) result.roadmap.items = [];
        return result;
    }

    async generateTechArchitecture(feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_TechArch> {
        const prompt = `STEP: TECHNOLOGY ARCHITECTURE. You are a solutions architect designing a system based on research findings.

METHODOLOGY: Extract ALL technology components, systems, platforms, and integrations mentioned in the research data. Map how they connect.

OVERVIEW: 3-5 sentences describing the technology landscape identified in the research. What systems exist? What's missing? Where are the integration gaps?

NODE TYPES (use these categories):
- "User": End-user touchpoints (web portals, mobile apps, kiosks)
- "Application": Software systems (CRM, LMS, ERP, custom apps)
- "Database": Data stores (data warehouse, lakes, operational DBs)
- "Integration": Middleware, APIs, ETL pipelines
- "External": Third-party services, cloud platforms, vendor systems
- "AI/ML": AI models, ML pipelines, analytics engines

FOR EACH NODE:
- id: unique identifier (e.g., "crm_1", "portal_web")
- label: Specific system name from the research (e.g., "Salesforce CRM", "Student Portal")
- type: One of the types above
- description: What it does and current state (from evidence)

FOR EACH FLOW:
- fromId/toId: Node IDs showing data/process flow
- action: What moves between them (e.g., "Student enrollment data sync", "API call for donor records")
- status: "active" | "planned" | "broken" (from research evidence)

REQUIREMENTS:
- Include ALL systems and tools mentioned in the corpus
- Identify integration gaps (nodes that SHOULD connect but don't)
- Flag legacy systems identified as problematic in the research
- Minimum 6 nodes and 5 flows

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                architecture: { type: Type.OBJECT, properties: { overview: { type: Type.STRING }, nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["id", "label", "type"] } }, flows: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { fromId: { type: Type.STRING }, toId: { type: Type.STRING }, action: { type: Type.STRING }, status: { type: Type.STRING } }, required: ["fromId", "toId", "action"] } } }, required: ["overview", "nodes", "flows"] }
            },
            required: ["methodology", "architecture"]
        };
        const result = await this.executeStep<StepResult_TechArch>(prompt, schema, [], onStream);
        if (!result.architecture) result.architecture = { overview: "", nodes: [], flows: [] } as any;
        if (!result.architecture.nodes) result.architecture.nodes = [];
        if (result.architecture) {
            result.architecture.diagramUrl = await generateImage(`High-Fidelity 3D Isometric Technical System Architecture. Clean floating nodes, data stream connections, white background, professional cloud infrastructure look.`, "16:9");
        }
        return result;
    }

    async generateDeckStructure(feedback: string | undefined, recommendations: StrategicRecommendation[] | undefined, onStream: (t: string) => void): Promise<StepResult_Structure> {
        const prompt = `STEP: DECK STRUCTURE. You are a McKinsey-trained presentation strategist.

NARRATIVE FRAMEWORK (Situation-Complication-Resolution):
Plan an executive research presentation with as many slides as the narrative requires. Let the volume and richness of the research evidence determine the slide count — do not artificially constrain to a fixed number. Follow this arc:

1. HOOK (1 slide, KEY_STATISTIC): The single most surprising finding. One large number or statement that stops the audience.
2. SITUATION (2-3 slides): What's happening in the landscape. Use EVIDENCE_WALL and DATA_INSIGHT layouts. Cite [CHUNK_XXX] sources.
3. COMPLICATION (2-3 slides): Why this matters. Use PERSONA_SPOTLIGHT and QUOTE_FEATURE layouts. Show real stakeholder perspectives.
4. RESOLUTION (3-4 slides): What to do. Use RECOMMENDATION layouts. Each must reference evidence. Quantify impact where possible.
5. CLOSE (1 slide, CLOSING_CTA): Single call-to-action with specific next steps.

AVAILABLE LAYOUTS:
- TITLE_SLIDE: Opening title with subtitle
- KEY_STATISTIC: Single powerful number, full-width (used for hook)
- EVIDENCE_WALL: 3-4 findings side by side with source badges
- QUOTE_FEATURE: Full-width quote with attribution and context
- PERSONA_SPOTLIGHT: Persona card with their key tension and photo
- DATA_INSIGHT: Chart/data interpretation with "so what" framing
- COMPARISON: Before/after or current/desired state
- RECOMMENDATION: Action + evidence + expected impact
- SECTION_HEADER: Section divider
- CONTENT_SPLIT_RIGHT: Text left, image right
- CONTENT_SPLIT_LEFT: Image left, text right
- CLOSING_CTA: Call to action with next steps

REQUIREMENTS:
- At least 1 KEY_STATISTIC slide
- At least 1 QUOTE_FEATURE slide with a direct quote from the corpus
- At least 1 PERSONA_SPOTLIGHT slide
- At least 2 RECOMMENDATION slides
- The storyArc must describe the narrative tension: what's at stake, why now, what happens if we don't act
- Each slide rationale must explain WHY this slide appears at this point in the story

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
${recommendations ? 'AVAILABLE RECOMMENDATIONS: ' + JSON.stringify(recommendations.map(r => r.title)) : ''}
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
                            layout: { type: Type.STRING, enum: ['TITLE_SLIDE', 'KEY_STATISTIC', 'EVIDENCE_WALL', 'QUOTE_FEATURE', 'PERSONA_SPOTLIGHT', 'DATA_INSIGHT', 'COMPARISON', 'RECOMMENDATION', 'SECTION_HEADER', 'CONTENT_SPLIT_RIGHT', 'CONTENT_SPLIT_LEFT', 'FULL_BLEED_IMAGE', 'TYPOGRAPHY_QUOTE', 'CLOSING_CTA'] }, 
                            title: { type: Type.STRING }, 
                            rationale: { type: Type.STRING } 
                        },
                        required: ["slideNumber", "layout", "title", "rationale"]
                    } 
                }
            },
            required: ["methodology", "storyArc", "slides"]
        };
        const result = await this.executeStep<StepResult_Structure>(prompt, schema, [], onStream);
        if (!result.slides) result.slides = [];
        return result;
    }

    async generateNarrative(structure: StepResult_Structure, recommendations: StrategicRecommendation[] | undefined, feedback: string | undefined, onStream: (t: string) => void): Promise<StepResult_Narrative> {
        const prompt = `STEP: NARRATIVE CONTENT. You are a McKinsey-trained deck writer creating an executive research presentation.

STORYTELLING RULES — non-negotiable:
- NEVER use self-referential filler: "Good morning", "Today we'll discuss", "Let's explore", "In this presentation"
- NEVER use hedge words: "It seems", "Perhaps", "It's possible that"
- LEAD with the insight, not the setup. First sentence = the finding or the provocation.
- Every slide must make the audience FEEL something: urgency, surprise, opportunity, concern
- Use specific numbers, names, and dates from the corpus — not generalities
- The narrative arc is: LANDSCAPE → TRENDS → INSIGHTS → CHALLENGES → PERSONAS → NEEDS → PAIN POINTS → SOLUTIONS → FUTURE VISION

FOR EACH SLIDE:
- title: Punchy, insight-driven (BAD: "Market Overview". GOOD: "63% of Donors Now Discover via AI — Search Is Dead")
- content: 2-4 bullets. Each bullet = specific data point + [CHUNK_XXX] citation. No filler.
- narrative: 2-3 sentences the PRESENTER says. Must add CONTEXT the slide doesn't show. No "As you can see..." or "This slide shows..."
  GOOD: "This number stunned us. When we dug into the data, we found that the shift happened in just 18 months — and most advancement offices haven't adapted."
  BAD: "Good morning everyone. Today I'd like to walk you through our findings on fundraising trends."
- visualPrompt: Describe a photograph or data visualization that SUPPORTS the insight (not decorates it)
- quote: A direct quote from the corpus, verbatim, that stops the audience
- speakerNotes: Deeper context, potential audience objections, and transition to next slide

SLIDE-TYPE-SPECIFIC RULES:
- KEY_STATISTIC: content[0] = the single shocking number. content[1] = why it matters with source. The title IS the statistic.
- EVIDENCE_WALL: 3-4 findings from DIFFERENT sources, side by side, showing convergence or contradiction.
- QUOTE_FEATURE: A stakeholder quote so vivid the audience remembers it. The quote alone tells the story.
- PERSONA_SPOTLIGHT: Open with the persona's core tension. Make the audience EMPATHIZE before recommending.
- RECOMMENDATION: content[0] = specific action (verb + outcome). content[1] = quantified impact. content[2] = evidence justifying the investment.
- CLOSING_CTA: 3 next steps with WHO does WHAT by WHEN. No vague "consider exploring..."

VIDEO SCRIPT (required — generate one scene per slide):
For each scene in videoScript:
- sceneNumber: matches slideNumber
- audioNarration: 3-5 sentences of voiceover narration. This is the SPOKEN WORD for the video. Must be compelling, insight-driven, and reference specific findings. NO empty narration. Every scene MUST have narration text.
- visualPrompt: detailed image generation prompt describing what the viewer sees
- quote: a direct corpus quote that supports this scene (if applicable)

ANTI-PATTERNS FOR VIDEO NARRATION:
- NEVER leave audioNarration empty or blank
- NEVER start with "Good morning" or "Welcome to"
- NEVER use "In this scene we see..." — describe what matters, not what's on screen
- Each scene narration must stand alone as compelling spoken content

${feedback ? 'FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                videoScript: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sceneNumber: { type: Type.INTEGER }, visualDescription: { type: Type.STRING }, audioNarration: { type: Type.STRING }, quote: { type: Type.STRING }, visualPrompt: { type: Type.STRING } }, required: ["sceneNumber", "audioNarration", "visualPrompt"] } },
                slides: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            slideNumber: { type: Type.INTEGER }, 
                            layout: { type: Type.STRING, enum: ['TITLE_SLIDE', 'KEY_STATISTIC', 'EVIDENCE_WALL', 'QUOTE_FEATURE', 'PERSONA_SPOTLIGHT', 'DATA_INSIGHT', 'COMPARISON', 'RECOMMENDATION', 'SECTION_HEADER', 'CONTENT_SPLIT_RIGHT', 'CONTENT_SPLIT_LEFT', 'FULL_BLEED_IMAGE', 'TYPOGRAPHY_QUOTE', 'CLOSING_CTA'] }, 
                            title: { type: Type.STRING }, 
                            content: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                            narrative: { type: Type.STRING }, 
                            visualPrompt: { type: Type.STRING },
                            quote: { type: Type.STRING },
                            speakerNotes: { type: Type.STRING }
                        },
                        required: ["slideNumber", "layout", "title", "content", "narrative", "visualPrompt"]
                    } 
                }
            },
            required: ["methodology", "videoScript", "slides"]
        };
        const result = await this.executeStep<StepResult_Narrative>(prompt, schema, [], onStream);
        if (!result.videoScript) result.videoScript = [];
        if (!result.slides) result.slides = [];
        
        const slidesWithStyle = (result.slides).map(slide => ({ ...slide, style: { ...DEFAULT_STYLE } }));
        return { ...result, slides: slidesWithStyle };
    }

    // --- NEW OUTPUT GENERATORS (Sprint 4) ---

    async generateGapAnalysis(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        const prompt = `STEP: GAP ANALYSIS. You are a senior management consultant performing a rigorous gap analysis.

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
- Each gap MUST have: capability, currentMaturity, targetMaturity, gap (number), severity, impact (with [CHUNK_XXX]), effort
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
                    gaps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, currentMaturity: { type: Type.NUMBER }, targetMaturity: { type: Type.NUMBER }, gap: { type: Type.NUMBER }, severity: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } }, required: ["capability", "currentMaturity", "targetMaturity", "gap", "severity", "impact", "effort"] } },
                    prioritizedActions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, priority: { type: Type.STRING }, timeline: { type: Type.STRING }, gapReference: { type: Type.STRING } }, required: ["action", "priority", "timeline"] } },
                    quickWins: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } }, required: ["action", "impact", "effort"] } },
                    riskRegister: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { risk: { type: Type.STRING }, likelihood: { type: Type.STRING }, impact: { type: Type.STRING }, mitigation: { type: Type.STRING } }, required: ["risk", "likelihood", "impact", "mitigation"] } },
                }, required: ["assessmentScope", "currentState", "desiredState", "gaps", "prioritizedActions", "quickWins", "riskRegister"] }
            },
            required: ["methodology", "analysis"]
        };
        return this.executeStep<any>(prompt, schema, [], onStream);
    }

    async generateTechAudit(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        const prompt = `STEP: TECHNOLOGY ECOSYSTEM AUDIT. You are a technology analyst performing a comprehensive systems inventory.

METHODOLOGY: Scan ALL corpus chunks for mentions of software, platforms, tools, databases, APIs, vendors, and technology processes.

SYSTEMS INVENTORY: For EVERY technology system identified:
- name: Exact system name from the data (e.g., "Slate CRM", "Banner ERP", "Canvas LMS")
- vendor: Company/provider
- category: "CRM" | "ERP" | "LMS" | "Analytics" | "Communication" | "Database" | "Custom" | "Cloud" | other
- users: Who uses it (from evidence)
- department: Which department owns it
- status: "active" | "legacy" | "deprecated" | "planned" — based on corpus evidence [CHUNK_XXX]

INTEGRATION MAP: For EVERY connection between systems:
- source/target: System names
- method: "API" | "file transfer" | "manual" | "middleware" | "none (siloed)"
- health: "healthy" | "degraded" | "broken" — from evidence
- dataFlow: What data moves between them

CAPABILITY MATRIX: Score organizational capabilities (from themes) on maturity 1-5.

CONSOLIDATION OPPORTUNITIES: Where multiple systems serve the same function. Cite evidence.

RECOMMENDATIONS: Technology-specific actions with [CHUNK_XXX] citations.

IMPORTANT: Only include systems that have EVIDENCE in the corpus. Do not hallucinate vendor names.

${feedback ? 'USER FEEDBACK: ' + feedback : ''}
Output JSON.`;
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                methodology: { type: Type.STRING },
                audit: { type: Type.OBJECT, properties: {
                    systemsInventory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, vendor: { type: Type.STRING }, category: { type: Type.STRING }, users: { type: Type.STRING }, department: { type: Type.STRING }, status: { type: Type.STRING } } } },
                    integrationMap: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, method: { type: Type.STRING }, health: { type: Type.STRING }, dataFlow: { type: Type.STRING } } } },
                    capabilityMatrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { capability: { type: Type.STRING }, currentMaturity: { type: Type.NUMBER }, targetMaturity: { type: Type.NUMBER }, gap: { type: Type.NUMBER } } } },
                    consolidationOpportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impact: { type: Type.STRING }, effort: { type: Type.STRING } } } },
                    recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, impactLevel: { type: Type.STRING }, actionItems: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
                } }
            },
            required: ["methodology", "audit"]
        };
        return this.executeStep<any>(prompt, schema, [], onStream);
    }

    async generateCompetitiveAnalysis(feedback: string | undefined, onStream: (t: string) => void): Promise<any> {
        const prompt = `STEP: COMPETITIVE & LANDSCAPE ANALYSIS. You are a senior industry analyst.

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
                        isArchetype: { type: Type.BOOLEAN }
                    }, required: ["name", "position", "strengths", "weaknesses", "differentiators"] } },
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
        return this.executeStep<any>(prompt, schema, [], onStream);
    }

    async visualizeNarrative(narrativeData: StepResult_Narrative, personas: Persona[], recommendations: StrategicRecommendation[], outputs: OutputOption[], onStatus: (s: string) => void, onStream?: (t: string) => void): Promise<StepResult_Final> {
        const scriptWithImages: ScriptScene[] = [];
        const personaMap = new Map<string, string>();
        personas.forEach(p => { if (p.imageUrl) personaMap.set(p.name, p.imageUrl); });

        if (outputs.includes('VIDEO_SCRIPT')) {
            onStatus("Visualizing Storyboard...");
            // SAFEGUARD: Ensure videoScript array exists
            const scripts = narrativeData.videoScript || [];
            for (let i = 0; i < scripts.length; i++) {
                const scene = scripts[i];
                onStatus(`Visualizing Scene ${i+1}/${scripts.length}...`);
                let refImage = scene.personaRef && personaMap.has(scene.personaRef) ? personaMap.get(scene.personaRef) : undefined;
                const url = await generateImage(scene.visualPrompt || scene.visualDescription, "16:9", refImage);
                scriptWithImages.push({ ...scene, imageUrl: url, videoStatus: 'idle', imageStatus: 'idle' });
            }
        }

        let slidesWithImages: Slide[] = [];
        if (outputs.includes('STRATEGY_DECK')) {
            onStatus("Visualizing Strategy Deck (Sequential Generation)...");
            // Sequential generation to prevent Quota Exceeded errors
            const slides = narrativeData.slides || [];
            for (let i = 0; i < slides.length; i++) {
                 const slide = slides[i];
                 onStatus(`Visualizing Slide ${i+1}/${slides.length}...`);
                 const aspectRatio = (slide.layout.includes('SPLIT')) ? "1:1" : "16:9";
                 const url = await generateImage(slide.visualPrompt, aspectRatio);
                 slidesWithImages.push({ ...slide, imageUrl: url, imageStatus: 'idle' });
            }
        }

        return { methodology: narrativeData.methodology, videoScript: scriptWithImages, slides: slidesWithImages, recommendations: recommendations };
    }

    private async executeStep<T>(prompt: string, schema: Schema, parts: any[] = [], onStream: (t: string) => void): Promise<T> {
        const result = await withRetry<any>(() => this.chatSession.sendMessageStream({
            message: [...parts, { text: prompt }],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        }), 3, 2000, "GenAI Step Execution");

        let fullText = "";
        const stream = (result.stream || result) as AsyncIterable<GenerateContentResponse>;

        try {
            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    fullText += text;
                    onStream(fullText);
                }
            }
        } catch (streamError) {
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
            return parsed;
        } catch (e) {
            console.error("Critical JSON Parse Error", e, "Raw:", cleanedText.substring(0, 100) + "...");
            throw new Error(`Failed to parse Gemini response: ${e instanceof Error ? e.message : 'Unknown Error'}`);
        }
    }
}
