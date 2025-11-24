import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FileUpload, AnalysisResult, Persona, ScriptScene, AnalysisType, Slide } from "../types";

// Schema definition for the expected JSON output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    methodology: { 
        type: Type.STRING, 
        description: "TRANSPARENCY LOG: A MASSIVE, VERBOSE, STEP-BY-STEP reasoning stream. You MUST use these tags: [PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT]. REQUIREMENT: You must generate at least 25 distinct thinking events (Minimum 8 [QUESTION], 8 [HYPOTHESIS], 8 [INSIGHT]) before finalizing the data." 
    },
    themes: {
      type: Type.ARRAY,
      description: "Key market research themes. Must be exhaustive based on data.",
      items: { 
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING, description: "Brief explanation of the theme." },
            quote: { type: Type.STRING, description: "Direct verbatim quote from the provided research files that proves this theme exists." }
        },
        required: ["name", "description", "quote"]
      }
    },
    personas: {
      type: Type.ARRAY,
      description: "All distinct user personas identified in the data.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING, description: "Job title or societal role" },
          demographics: { type: Type.STRING, description: "Specifics: Age, Location, Education, Tech Literacy, Income Level, Household." },
          quote: { type: Type.STRING, description: "A synthetic summary quote capturing their essence." },
          bio: { type: Type.STRING, description: "A nuanced backstory." },
          fiveWs: {
            type: Type.OBJECT,
            description: "Strategic 5 W's Analysis",
            properties: {
                who: { type: Type.STRING, description: "Who: Which emerging audience, community, or mindset should be understood?" },
                what: { type: Type.STRING, description: "What: What are they talking about, feeling, or resisting in culture?" },
                whenWhere: { type: Type.STRING, description: "When/Where: When and where do these narratives show up (online spaces, content, micro-moments)?" },
                why: { type: Type.STRING, description: "Why: Why does this matter? What opportunities or tensions could this unlock?" }
            },
            required: ["who", "what", "whenWhere", "why"]
          },
          motivations: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The motivation" },
                    quote: { type: Type.STRING, description: "Direct source quote validating this motivation." }
                },
                required: ["label", "quote"]
            } 
          },
          tasks: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The task/job" },
                    quote: { type: Type.STRING, description: "Direct source quote validating this task." }
                },
                required: ["label", "quote"]
            },
            description: "Jobs to be done" 
          },
          painPoints: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The pain point" },
                    quote: { type: Type.STRING, description: "Direct source quote validating this pain point." }
                },
                required: ["label", "quote"]
            } 
          },
          opportunities: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The opportunity" },
                    quote: { type: Type.STRING, description: "Direct source quote validating this opportunity." }
                },
                required: ["label", "quote"]
            },
            description: "Product or service opportunities" 
          },
        },
        required: ["name", "role", "demographics", "quote", "bio", "fiveWs", "motivations", "tasks", "painPoints", "opportunities"]
      }
    },
    videoScript: {
      type: Type.ARRAY,
      description: "A video script (min 16 scenes, ~2m 10s) presenting a research analysis. Must cover ALL identified themes.",
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          visualDescription: { type: Type.STRING, description: "Highly detailed AI image prompt. NO UI, NO SCREENS, NO TEXT. Focus on cinematic human behavior, lighting, and context. Style: Observational documentary." },
          audioNarration: { type: Type.STRING, description: "Voiceover script. Factual, insight-driven analysis explaining the 'why'. Tone: Expert Ethnographer." },
          durationSeconds: { type: Type.INTEGER, description: "Should be approximately 8 seconds." },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords like 'Insight', 'Theme X', 'Persona Y'" },
          personaRef: { type: Type.STRING, description: "Exact Name of the Persona if they appear in this scene. Leave empty if generic or landscape." },
          quote: { type: Type.STRING, description: "Direct verbatim quote from research sources that supports the insight in this specific scene." }
        },
        required: ["sceneNumber", "visualDescription", "audioNarration", "durationSeconds", "tags", "quote"]
      }
    },
    slides: {
      type: Type.ARRAY,
      description: "A comprehensive strategy deck (EXACTLY 12 SLIDES) mirroring the selected Research Lens structure.",
      items: {
        type: Type.OBJECT,
        properties: {
          slideNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Impactful slide headline. Keep it punchy." },
          bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dense, data-heavy strategic findings. Not high-level fluff." },
          speakerNotes: { type: Type.STRING, description: "Detailed narrative for the presenter to speak to this slide." },
          visualPrompt: { type: Type.STRING, description: "Description for an image to accompany this slide. Suggest which scene from the video script would fit best here." },
          quote: { type: Type.STRING, description: "Direct verbatim quote from research sources that validates the strategy on this slide." }
        },
        required: ["slideNumber", "title", "bulletPoints", "speakerNotes", "visualPrompt", "quote"]
      }
    }
  },
  required: ["methodology", "themes", "personas", "videoScript", "slides"]
};

// Helper to generate an image for a specific prompt
export const generateImage = async (prompt: string, aspectRatio: string = "16:9", refImageBase64?: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Enhance prompt to force photorealism and hide bad details (bokeh)
    const enhancedPrompt = `${prompt}. 
    Style: Award-winning documentary photography, shot on Kodak Portra 400, 35mm film grain, candid.
    Camera: 85mm lens, f/1.8 aperture, shallow depth of field, bokeh background.
    Rules: NO TEXT, NO USER INTERFACES, NO SCREENS WITH DATA, NO CARTOONS. Photorealistic, cinematic lighting, highly detailed texture.`;

    // Build parts. If we have a ref image, add it.
    const parts: any[] = [{ text: enhancedPrompt }];
    if (refImageBase64) {
        const cleanBase64 = refImageBase64.split(',')[1] || refImageBase64;
        parts.unshift({
            inlineData: {
                mimeType: 'image/png',
                data: cleanBase64
            }
        });
        parts[parts.length-1].text += " Keep the character consistency based on the provided reference image.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.warn("Image generation failed for prompt:", prompt, error);
    return undefined;
  }
  return undefined;
};

// New Helper to generate Video using Veo 3.1
export const generateSceneVideo = async (prompt: string, rawBase64Image?: string): Promise<string | undefined> => {
  if (!process.env.API_KEY) return undefined;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let base64Data = '';

    // Clean base64 string if provided (remove data:image/png;base64, prefix)
    let imagePart = undefined;
    if (rawBase64Image) {
      base64Data = rawBase64Image.split(',')[1] || rawBase64Image;
      imagePart = {
        imageBytes: base64Data,
        mimeType: 'image/png'
      };
    }

    // STEP 1: Scene Logic Analysis (Gemini 3 Pro)
    let optimizedPrompt = prompt;
    if (base64Data) {
        try {
            const analysisResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: base64Data
                            }
                        },
                        {
                            text: "You are a logic supervisor for a video effects team. Analyze this still image. Write a concise, precise video generation prompt to animate this scene for 5 seconds.\n" +
                                  "CRITICAL INSTRUCTIONS:\n" +
                                  "1. LOOK at the details. If a traffic light is red, cars MUST BE stationary.\n" +
                                  "2. If people are seated/static, they should not start walking randomly.\n" +
                                  "3. Enforce physics: Gravity, momentum, and object permanence must be respected.\n" +
                                  "4. Describe the 'movement' or 'atmosphere' (e.g., subtle wind, breathing, blinking, camera pan) rather than impossible actions.\n" +
                                  "Output ONLY the prompt text."
                        }
                    ]
                }
            });
            if (analysisResponse.text) {
                optimizedPrompt = analysisResponse.text;
                console.log("Optimized Video Prompt:", optimizedPrompt);
            }
        } catch (err) {
            console.warn("Scene logic analysis failed, falling back to original prompt", err);
        }
    }

    // STEP 2: Generate Video with Veo 3.1 High Quality
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: `${optimizedPrompt}. Cinematic, photorealistic, 8k, highly detailed, smooth motion. Maintain consistent physics and object permanence. No morphing or distortion.`,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) return undefined;

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};

export const generatePersonaStory = async (
    files: FileUpload[], 
    analysisType: AnalysisType = 'GENERAL_ETHNOGRAPHY',
    onStreamUpdate?: (text: string) => void,
    onStatusUpdate?: (status: string) => void
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const fileParts = files.map(file => ({
    inlineData: {
      mimeType: file.type,
      data: file.data
    }
  }));

  // DETAILED THINKING SCRIPTS FOR EACH STRATEGY - DYNAMIC AND CONTEXT AWARE
  const strategies: Record<AnalysisType, string> = {
    GENERAL_ETHNOGRAPHY: `
        FOCUS: Broad Ethnographic Overview & Cultural Context.
        THINKING SCRIPT (You MUST follow this order in your methodology log):
        1. [PHASE] Data Ingestion & Context Detection.
        2. [QUESTION] What is the 'World' described here? (e.g., A hospital, a school, a digital forum, a household).
        3. [QUESTION] Who are the actors and what is the atmosphere?
        4. [PHASE] Ritual & Behavior Analysis.
        5. [QUESTION] What are the repeated behaviors or 'rituals' in this specific world?
        6. [HYPOTHESIS] Actors perform X ritual because of Y unwritten social rule.
        7. [PHASE] Power Dynamics & Social Structure.
        8. [QUESTION] Who holds the power? Who is the outlier?
        9. [INSIGHT] The core unspoken rule of this group is...
        10. [INSIGHT] The emerging sub-culture is...
    `,
    WHITESPACE_OPPORTUNITY: `
        FOCUS: Unmet Needs, Systemic Gaps & 'Blue Ocean' Analysis.
        THINKING SCRIPT (You MUST follow this order in your methodology log):
        1. [PHASE] Landscape & Status Quo Assessment.
        2. [QUESTION] What is the current 'Standard Operating Procedure' or dominant solution?
        3. [QUESTION] Where does the current system fail or cause friction?
        4. [PHASE] 'Workaround' Detection.
        5. [QUESTION] Where are users 'hacking' the system or creating their own fixes? (This reveals the gap).
        6. [HYPOTHESIS] The market ignores the needs of [Segment X] because...
        7. [PHASE] Opportunity Definition.
        8. [QUESTION] What if we eliminated [Constraint Y]?
        9. [INSIGHT] The whitespace lies in the intersection of [Trend A] and [Need B].
        10. [INSIGHT] A disruptive opportunity exists in...
    `,
    BEHAVIORAL_PSYCHOLOGY: `
        FOCUS: Deep Behavioral Drivers, Habits & Cognitive Loads.
        THINKING SCRIPT (You MUST follow this order in your methodology log):
        1. [PHASE] Context & Goal Identification.
        2. [QUESTION] What is the user *trying* to achieve vs what they *actually* do?
        3. [PHASE] Trigger Mapping (Internal/External).
        4. [QUESTION] What prompts the behavior? (Emotion, Notification, Pain).
        5. [PHASE] Action & Ability Analysis.
        6. [QUESTION] How hard is it to perform the action? (Friction Audit).
        7. [HYPOTHESIS] Cognitive bias [Loss Aversion/Social Proof/etc.] is driving this decision.
        8. [PHASE] Reward & Reinforcement.
        9. [QUESTION] What is the payoff? Is it satisfying?
        10. [INSIGHT] The behavior is driven by a deep need for [Core Psychological Driver].
    `,
    CUSTOMER_JOURNEY: `
        FOCUS: End-to-End Journey Analysis (DYNAMIC CONTEXT - e.g., Patient, Employee, Student, or Buyer).
        THINKING SCRIPT (You MUST follow this order in your methodology log):
        1. [PHASE] Journey Mapping & Stage Detection.
        2. [QUESTION] What is the specific 'Journey' here? (e.g. 'Recovery from surgery', 'Learning a new skill', 'Buying a car', 'Onboarding at a job').
        3. [QUESTION] What are the natural 4-5 stages of *this specific* journey? (Do NOT force a retail structure if not applicable).
        4. [PHASE] Stage 1 Analysis (The Entry/Onset).
        5. [HYPOTHESIS] Users enter this journey driven by [Internal/External] force.
        6. [PHASE] The 'Middle' Analysis (The Struggle/Work/Experience).
        7. [QUESTION] Where is the highest friction, emotional dip, or 'Valley of Despair'?
        8. [PHASE] The Outcome Analysis (Resolution/Exit/Retention).
        9. [INSIGHT] The critical definition of 'Success' for this user is...
        10. [INSIGHT] The biggest drop-off point is caused by...
    `
  };

  // SLIDE TEMPLATES - DYNAMIC STRUCTURES
  const slideTemplates: Record<AnalysisType, string> = {
    GENERAL_ETHNOGRAPHY: `
      Slide 1: Executive Summary.
      Slide 2: Research Scope & The 'World' Context.
      Slide 3: Key Environmental Factors.
      Slide 4: Ritual Analysis: The Recurring Behaviors.
      Slide 5: Persona Archetype A (Deep Dive).
      Slide 6: Persona Archetype B (Deep Dive).
      Slide 7: Social Dynamics & Power Structures.
      Slide 8: Language & Vernacular Analysis.
      Slide 9: Tension Points in Daily Life.
      Slide 10: Emerging Cultural Shifts.
      Slide 11: Strategic Implications for the Organization.
      Slide 12: Future Roadmap & Recommendations.
    `,
    WHITESPACE_OPPORTUNITY: `
      Slide 1: The Opportunity Snapshot.
      Slide 2: Current Landscape: The 'Status Quo'.
      Slide 3: Systemic Failures & Blind Spots.
      Slide 4: User Hacks & Workarounds (Evidence of Need).
      Slide 5: The 'Gap' Definition.
      Slide 6: Target Audience for Innovation.
      Slide 7: Concept A: The Immediate Fix.
      Slide 8: Concept B: The Disruptive Leap.
      Slide 9: Barriers to Entry & Mitigation.
      Slide 10: Value Proposition Canvas.
      Slide 11: The 'Blue Ocean' Strategy.
      Slide 12: Go-To-Market / Implementation Plan.
    `,
    BEHAVIORAL_PSYCHOLOGY: `
      Slide 1: Behavioral Audit Summary.
      Slide 2: Psychographic & Mindset Overview.
      Slide 3: The Trigger Map (Internal & External).
      Slide 4: Routine Analysis: The Current Path.
      Slide 5: Friction Audit & Cognitive Load.
      Slide 6: Cognitive Biases Identified.
      Slide 7: Emotional Drivers vs. Functional Needs.
      Slide 8: The Reward Loop Analysis.
      Slide 9: Motivation vs. Ability Matrix.
      Slide 10: Behavioral Nudge Opportunities.
      Slide 11: Habit Formation Strategy.
      Slide 12: Behavioral Design Recommendations.
    `,
    CUSTOMER_JOURNEY: `
      Slide 1: Journey Executive Summary.
      Slide 2: Journey Context (Who, What, Where).
      Slide 3: Journey Stage 1 Analysis (Name this stage dynamically based on data).
      Slide 4: Journey Stage 2 Analysis (Name this stage dynamically based on data).
      Slide 5: Journey Stage 3 Analysis (Name this stage dynamically based on data).
      Slide 6: Journey Stage 4 Analysis (Name this stage dynamically based on data).
      Slide 7: Journey Stage 5 Analysis (Name this stage dynamically based on data).
      Slide 8: The Emotional Curve (Highs vs Lows).
      Slide 9: Deep Dive: The Critical Friction Point.
      Slide 10: Deep Dive: The 'Magic Moment' Opportunity.
      Slide 11: Strategic Pivot Recommendation.
      Slide 12: Future Ideal State Roadmap.
    `
  };

  const selectedStrategy = strategies[analysisType];
  const selectedSlides = slideTemplates[analysisType];

  const systemInstruction = `
    You are an elite Chief Experience Officer (CXO) and Expert Ethnographer using Gemini 3.
    
    CORE OBJECTIVE:
    Analyze unstructured research data to identify distinct user personas and deep market themes, then storyboard a factual, insight-driven video analysis.
    
    *** ANALYSIS STRATEGY: ${analysisType} ***
    ${selectedStrategy}
    
    *** STRATEGY DECK STRUCTURE (MUST GENERATE 12 SLIDES) ***
    You must follow this exact slide outline for the 'slides' array:
    ${selectedSlides}

    CRITICAL REQUIREMENT - DYNAMIC FRAMEWORK APPLICATION:
    - Do NOT force the data into a rigid retail/commercial framework if it does not fit (e.g. if the data is about healthcare, education, or employee experience, adapt the journey stages accordingly).
    - Detect the NATURAL phases and language of the research material.
    - Name the Slides dynamically where requested.

    CRITICAL REQUIREMENT - EXTENDED CHAIN OF THOUGHT:
    You must output a MASSIVE, DETAILED reasoning log in the 'methodology' field.
    - Do not summarize. Show your full "working out".
    - You must have AT LEAST 25 distinct thinking events ([PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT]) before generating the JSON data.
    - You MUST generate at least 8 [QUESTION], 8 [HYPOTHESIS], and 8 [INSIGHT] tags.
    - Follow the "THINKING SCRIPT" defined above for the selected strategy strictly.
    
    STRATEGIC FRAMEWORK (The 5 W's):
    For EVERY persona, you must explicitly synthesize the 5 W's:
    - Who: Which emerging audience, community, or mindset should be understood?
    - What: What are they talking about, feeling, or resisting in culture?
    - When/Where: When and where do these narratives show up?
    - Why: Why does this matter? What opportunities or tensions could this unlock?

    CRITICAL REQUIREMENT - GROUNDING & TRANSPARENCY:
    1. **Show Your Work (Methodology)**: Use [PHASE], [QUESTION], [HYPOTHESIS], [INSIGHT] tags.
    2. **Universal Citation**: You MUST provide a DIRECT VERBATIM QUOTE from the source files to validate EVERY claim.
    3. **Unlimited Deep Analysis**: Do not limit findings. Be exhaustive.
    4. **Visuals**: NO UI, NO SCREENS. Focus on cinematic human behavior.
    5. **Narrative**: Expert Ethnographer tone. Min 16 scenes.

    OUTPUT: JSON matching the schema.
  `;

  try {
    if (onStatusUpdate) onStatusUpdate("Initializing Analysis Stream...");
    
    // 1. Generate Text Analysis (Streamed)
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          ...fileParts,
          { text: "Analyze this research and generate the deep persona story package. Apply the selected strategic lens. Be exhaustive. Cite sources for everything. Provide a long, detailed thinking log." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        thinkingConfig: { thinkingBudget: 16384 },
        temperature: 0.1
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
        const chunkText = chunk.text;
        fullText += chunkText;
        if (onStreamUpdate) {
            onStreamUpdate(fullText);
        }
    }

    if (!fullText) throw new Error("No response generated from Gemini.");
    
    if (onStatusUpdate) onStatusUpdate("Parsing Analysis Results...");
    const result = JSON.parse(fullText) as AnalysisResult;

    // 2. Generate Images for Personas
    if (onStatusUpdate) onStatusUpdate(`Generating Persona Portraits (0/${result.personas.length})...`);
    
    const personaMap = new Map<string, string>(); 
    const personasWithImages = await Promise.all(result.personas.map(async (p, i) => {
        if (onStatusUpdate) onStatusUpdate(`Generating Persona Portrait for: ${p.name}...`);
        const prompt = `Portrait photography of ${p.role}, ${p.demographics}. ${p.bio.substring(0, 100)}. Authentic, highly detailed, 85mm lens.`;
        const imageUrl = await generateImage(prompt, "1:1");
        if (imageUrl) personaMap.set(p.name, imageUrl);
        return { ...p, imageUrl };
    }));

    // 3. Generate Images for Script Scenes
    if (onStatusUpdate) onStatusUpdate(`Visualizing Storyboard Scenes (0/${result.videoScript.length})...`);
    
    const scriptWithImages: ScriptScene[] = [];
    for (let i = 0; i < result.videoScript.length; i++) {
        const scene = result.videoScript[i];
        if (onStatusUpdate) onStatusUpdate(`Visualizing Scene ${i + 1}/${result.videoScript.length}...`);
        
        let refImage = undefined;
        if (scene.personaRef && personaMap.has(scene.personaRef)) {
            refImage = personaMap.get(scene.personaRef);
        }
        const imageUrl = await generateImage(scene.visualDescription, "16:9", refImage);
        scriptWithImages.push({
            ...scene,
            imageUrl,
            videoStatus: 'idle',
            imageStatus: 'idle'
        });
    }

    // 4. Map Images to Slides (Reuse Script Scenes to ensure Visual Consistency)
    if (onStatusUpdate) onStatusUpdate("Compiling Strategy Deck...");
    // We map script scenes to slides to ensure the characters and visual themes are consistent,
    // rather than generating random new abstract images.
    const slidesWithImages: Slide[] = result.slides.map((slide, index) => {
        // Simple mapping strategy: Distribute script scenes across slides
        // If we have more scenes than slides, we skip some. 
        // If we have fewer, we loop.
        let mappedImage = undefined;
        if (scriptWithImages.length > 0) {
             const sceneIndex = Math.floor((index / result.slides.length) * scriptWithImages.length);
             mappedImage = scriptWithImages[sceneIndex]?.imageUrl;
        }

        return { ...slide, imageUrl: mappedImage };
    });

    if (onStatusUpdate) onStatusUpdate("Finalizing Report...");

    return {
      methodology: result.methodology || "No methodology summary provided.",
      themes: result.themes,
      personas: personasWithImages,
      videoScript: scriptWithImages,
      slides: slidesWithImages
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};