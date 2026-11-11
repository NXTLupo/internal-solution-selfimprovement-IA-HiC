import { GoogleGenAI, Modality, GenerateContentResponse, Part } from "@google/genai";
import { ImageData, Character, Scene, VideoData, VideoClip, VideoGenerationConfig } from '../types';

// ✅ CORRECTED: API Key access for browser environment
const getApiKey = (): string => {
  // Try browser global first (injected by Flask)
  if (typeof window !== 'undefined' && (window as any).API_KEY) {
    return (window as any).API_KEY;
  }

  // Fallback to process.env for development
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }

  throw new Error("API_KEY is not available");
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// ✅ ADDED: Utility function to append API key to video URLs for browser access
const addApiKeyToVideoUrl = (url: string): string => {
  if (!url) return url;

  const apiKey = getApiKey();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}key=${apiKey}`;
};

// --- IndexedDB Service ---
const DB_NAME = 'ConsistentCharacterDB';
const DB_VERSION = 4; // Incremented to add video clips store
const CHARACTERS_STORE = 'characters';
const OBJECTS_STORE = 'objects';
const SCENES_STORE = 'scenes';
const VIDEO_CLIPS_STORE = 'videoClips';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        dbPromise = null;
        reject("Error opening database");
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CHARACTERS_STORE)) {
          db.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SCENES_STORE)) {
          db.createObjectStore(SCENES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(OBJECTS_STORE)) {
            db.createObjectStore(OBJECTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(VIDEO_CLIPS_STORE)) {
            db.createObjectStore(VIDEO_CLIPS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          console.log("Database connection closed.");
          dbPromise = null;
        };
        resolve(db);
      };
    });
  }
  return dbPromise;
};

const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
    });
};

const addItemsToStore = async <T>(storeName: string, items: T[]): Promise<void> => {
    if (!items || items.length === 0) {
        return Promise.resolve();
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        items.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const deleteItemFromStore = async (storeName: string, id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};


// --- Character DB Functions ---
export const loadCharactersFromDB = (): Promise<Character[]> => getAllFromStore<Character>(CHARACTERS_STORE);
export const addCharactersToDB = (characters: Character[]): Promise<void> => addItemsToStore(CHARACTERS_STORE, characters);
export const deleteCharacterFromDB = (id: string): Promise<void> => deleteItemFromStore(CHARACTERS_STORE, id);

// --- Object DB Functions ---
export const loadObjectsFromDB = (): Promise<Character[]> => getAllFromStore<Character>(OBJECTS_STORE);
export const addObjectsToDB = (objects: Character[]): Promise<void> => addItemsToStore(OBJECTS_STORE, objects);
export const deleteObjectFromDB = (id: string): Promise<void> => deleteItemFromStore(OBJECTS_STORE, id);


// --- Scene DB Functions ---
export const loadScenesFromDB = (): Promise<Scene[]> => getAllFromStore<Scene>(SCENES_STORE);
export const addSceneToDB = async (scene: Scene): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SCENES_STORE, 'readwrite');
        const store = transaction.objectStore(SCENES_STORE);
        store.put(scene);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const deleteSceneFromDB = (id: string): Promise<void> => deleteItemFromStore(SCENES_STORE, id);


// --- Video Clips DB Functions ---
export const loadVideoClipsFromDB = (): Promise<VideoClip[]> => getAllFromStore<VideoClip>(VIDEO_CLIPS_STORE);
export const addVideoClipToDB = async (videoClip: VideoClip): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(VIDEO_CLIPS_STORE, 'readwrite');
        const store = transaction.objectStore(VIDEO_CLIPS_STORE);
        store.put(videoClip);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const deleteVideoClipFromDB = (id: string): Promise<void> => deleteItemFromStore(VIDEO_CLIPS_STORE, id);


// --- Helper Functions for API Interaction ---

const extractImageData = (response: GenerateContentResponse): ImageData => {
  const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
  if (imagePart && imagePart.inlineData) {
    return {
      base64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    };
  }
  const fullText = response.text?.trim() || "No text content.";
  throw new Error(`No image data found in the API response. The model responded with: "${fullText}"`);
};

const extractEntityPairs = (response: GenerateContentResponse): { imageData: ImageData; description: string }[] => {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    if (parts.length === 0) {
        throw new Error(`Could not extract any entity data from the API response. Raw response: ${JSON.stringify(response, null, 2)}`);
    }

    const images: ImageData[] = [];
    let descriptions: string[] = [];

    parts.forEach(part => {
        if (part.inlineData) {
            images.push({
                base64: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
            });
        } else if (part.text) {
            const matches = [...part.text.matchAll(/---BEGIN_DESCRIPTION---([\s\S]*?)---END_DESCRIPTION---/g)];
            descriptions.push(...matches.map(match => match[1].trim()));
        }
    });
    
    if (images.length === 0) {
      const fullText = response.text?.trim() || JSON.stringify(response, null, 2);
      throw new Error(`Could not extract any entity images from the API response. The model responded with: "${fullText}"`);
    }

    const numPairs = Math.min(images.length, descriptions.length);
    if (images.length !== descriptions.length) {
        console.warn(`Mismatch between found images (${images.length}) and descriptions (${descriptions.length}). Pairing up to the minimum count.`);
    }

    const entityPairs = [];
    for (let i = 0; i < numPairs; i++) {
        entityPairs.push({
            imageData: images[i],
            description: descriptions[i]
        });
    }

    if (images.length > descriptions.length) {
        for (let i = descriptions.length; i < images.length; i++) {
            entityPairs.push({
                imageData: images[i],
                description: "AI-generated entity portrait."
            });
        }
    }

    if (entityPairs.length === 0) {
      throw new Error(`Could not pair any images and descriptions. Full API response without pairs:\n${JSON.stringify(response, null, 2)}`);
    }
    
    return entityPairs;
};

const mapImageAspectRatio = (ratio: string): string => {
  switch (ratio) {
    case '16:9':
    case '9:16':
    case '1:1':
      return ratio;
    default:
      return '1:1';
  }
};

const mapVideoAspectRatio = (ratio: string): '16:9' | '9:16' => {
  return ratio === '9:16' ? '9:16' : '16:9';
};

const mapVideoResolution = (resolution: string): '720p' | '1080p' => {
  return resolution === '720p' ? '720p' : '1080p';
};

const enforceAspectRatio = async (imageData: ImageData, ratio: string): Promise<ImageData> => {
  const targetRatios: Record<string, number> = {
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '1:1': 1,
  };

  const desiredRatio = targetRatios[ratio];
  if (!desiredRatio) return imageData;

  const dataUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const { width, height } = img;
      if (width === 0 || height === 0) {
        resolve(imageData);
        return;
      }

      const currentRatio = width / height;
      let cropWidth = width;
      let cropHeight = height;
      let cropX = 0;
      let cropY = 0;

      if (Math.abs(currentRatio - desiredRatio) > 0.001) {
        if (currentRatio > desiredRatio) {
          cropWidth = height * desiredRatio;
          cropX = (width - cropWidth) / 2;
        } else {
          cropHeight = width / desiredRatio;
          cropY = (height - cropHeight) / 2;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropWidth);
      canvas.height = Math.round(cropHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }

      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const updatedDataUrl = canvas.toDataURL(imageData.mimeType);
      const [, newBase64] = updatedDataUrl.split(',');
      resolve({
        base64: newBase64 || imageData.base64,
        mimeType: imageData.mimeType,
      });
    };

    img.onerror = () => resolve(imageData);
    img.src = dataUrl;
  });
};

// --- Core AI Generation Services ---

// Enhanced prompt building system based on Google Gemini 3 Pro Image best practices
const buildEnhancedCharacterPrompt = (description: string): string => {
  const hasConfidence = description.toLowerCase().includes('confident');
  const hasElegance = description.toLowerCase().includes('elegant') || description.toLowerCase().includes('graceful');
  const hasStrength = description.toLowerCase().includes('strong') || description.toLowerCase().includes('powerful');
  
  let postureDescription = 'stands with authentic presence, their demeanor naturally reflecting their unique personality';
  if (hasConfidence) postureDescription = 'carries themselves with quiet confidence, their posture naturally upright and composed';
  else if (hasElegance) postureDescription = 'holds themselves with natural grace, their stance reflecting poise and refinement';
  else if (hasStrength) postureDescription = 'displays a strong, grounded presence, their bearing showing inner resilience';

  return `Capture a professional studio portrait showcasing a person who embodies this character: ${description}.

PHOTOGRAPHIC SETUP: Position the subject standing naturally in front of a seamless light gray studio backdrop (RAL 7035). Use professional portrait lighting with a key light at 45 degrees, creating subtle shadows that define facial structure and form. The lighting should be soft and even, avoiding harsh contrasts while maintaining dimensional depth.

CAMERA PERSPECTIVE: Frame this as a full-body portrait using a 85mm equivalent lens from a slight low angle (5-10 degrees below eye level) to create a sense of presence and authority. The camera should be positioned 8-10 feet from the subject to capture the full figure while maintaining natural proportions.

VISUAL NARRATIVE: This person ${postureDescription}. Their clothing fits naturally, with realistic fabric textures and appropriate wear patterns. Every detail from their facial expression to their stance tells the story of who they are.

TECHNICAL SPECIFICATIONS: Shot with professional DSLR quality - sharp focus throughout, natural color grading with slight warmth (2800K-3200K), minimal depth of field blur to keep the entire figure crisp. Surface textures should show realistic detail: skin with natural variation, fabric with authentic weave patterns, materials with appropriate reflectivity.

Create this portrait as a single, cohesive photograph that could serve as a professional character reference.`;
};

export const generateCharacterImage = async (description: string): Promise<ImageData> => {
  const prompt = buildEnhancedCharacterPrompt(description);

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  return extractImageData(response);
};

export const generateObjectImage = async (description: string): Promise<ImageData> => {
    const prompt = `Generate a highly realistic photographic image of an object based on this description: "${description}". The object must be isolated on a clean, neutral, light-gray studio background. The image should be photorealistic and detailed.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    return extractImageData(response);
};

export const generateCharactersFromImage = async (image: ImageData, hint: string): Promise<{ imageData: ImageData; description:string }[]> => {
    const prompt = `
    **Primary Directive:** Your task is to analyze the provided image and autonomously identify every distinct person visible. You must perform the following actions for EACH person without asking for clarification.

    **Process for Each Person:**
    1.  **Generate Portrait:** Create a new, full-body, highly realistic photographic portrait of the identified person. The person must be isolated on a clean, neutral, light-gray studio background.
    2.  **Provide Description:** Immediately following the image generation, write a detailed text description of the person in the portrait you just created. This description MUST be enclosed within the following markers: \`---BEGIN_DESCRIPTION---[Your description here]---END_DESCRIPTION---\`.

    **Execution Rules:**
    -   You MUST repeat the "Generate Portrait -> Provide Description" sequence for every single person you find in the source image.
    -   **CRITICAL:** Do not ask for clarification on which person to process. Process all of them.
    -   The number of generated images must exactly match the number of \`---BEGIN_DESCRIPTION---...---END_DESCRIPTION---\` blocks.
    -   If for any reason (e.g., safety policy) you cannot generate a portrait for a person, you MUST also omit their description block. Maintain a 1:1 ratio of images to descriptions.

    **User Hint (Optional):** Use the following hint to influence the style of the generated portraits.
    User Hint: "${hint || 'No hint provided.'}"
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: image.base64, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return extractEntityPairs(response);
};

export const generateObjectsFromImage = async (image: ImageData, hint: string): Promise<{ imageData: ImageData; description: string }[]> => {
    const prompt = `
    **Primary Directive:** Your task is to analyze the provided image and autonomously identify every distinct, primary inanimate object. You must perform the following actions for EACH object without asking for clarification. Ignore people and background elements unless they are the main subject.

    **Process for Each Object:**
    1.  **Generate Image:** Create a new, highly realistic photographic image of the identified object. The object must be isolated on a clean, neutral, light-gray studio background.
    2.  **Provide Description:** Immediately following the image generation, write a detailed text description of the object in the image you just created. This description MUST be enclosed within markers: \`---BEGIN_DESCRIPTION---[Your description here]---END_DESCRIPTION---\`.

    **Execution Rules:**
    -   You MUST repeat the "Generate Image -> Provide Description" sequence for every primary object you find.
    -   **CRITICAL:** Do not ask for clarification. Process all identifiable primary objects.
    -   The number of generated images must exactly match the number of description blocks.
    -   If you cannot generate an image for an object, you MUST also omit its description.

    **User Hint (Optional):** Use the following hint to influence the style of the generated objects.
    User Hint: "${hint || 'No hint provided.'}"
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: image.base64, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return extractEntityPairs(response);
};

// --- Video Generation Services ---
//
// Veo is not served on this account: every Veo id, including the veo-3.1-fast-generate-preview
// this file used to call, returns "model not found" (checked 2026-11-10). The video seat is
// Gemini Omni 1.2 Flash (owner decision, 2026-11-10). It is not a generateVideos model: it is
// called through the Interactions API (POST /v1beta/interactions) and returns the finished MP4,
// with native audio, inline in the same response, so there is no long-running operation to poll.
// The installed @google/genai (1.19) has no interactions surface, so this is a REST fetch.

export const VIDEO_MODEL = 'gemini-omni-1.2-flash';
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const VIDEO_DEFAULT_SECONDS = 8;
const VIDEO_MIN_SECONDS = 3;
const VIDEO_MAX_SECONDS = 15;
const VIDEO_MAX_SECONDS_WITH_END_FRAME = 10; // first-and-last-frame interpolation supports 3 to 10 s
const VIDEO_MAX_IMAGES = 6; // reference images per request

type InteractionImagePart = { type: 'image'; data: string; mime_type: string };

const toInteractionImage = (image: ImageData): InteractionImagePart => ({
  type: 'image',
  data: image.base64,
  mime_type: image.mimeType,
});

// Find the generated video in an Interactions response: steps[] -> model_output -> content[] -> video.
const findInteractionVideo = (payload: any): { data?: string; uri?: string; mime_type?: string } | null => {
  for (const step of payload?.steps ?? []) {
    for (const part of step?.content ?? []) {
      if (part?.type === 'video' && (part.data || part.uri)) return part;
    }
  }
  return null;
};

const collectInteractionText = (payload: any): string =>
  (payload?.steps ?? [])
    .flatMap((step: any) => step?.content ?? [])
    .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text.trim())
    .filter(Boolean)
    .join(' ');

// Character portraits go to the model as identity references, not as opening or closing frames.
// Subject reference supports up to 2 characters per request.
const VIDEO_MAX_REFERENCE_CHARACTERS = 2;
const characterReferenceImages = (characters: Character[]): ImageData[] =>
  characters
    .map(c => c.imageData)
    .filter((img): img is ImageData => !!img?.base64)
    .slice(0, VIDEO_MAX_REFERENCE_CHARACTERS);

export const generateVideoClip = async (
  prompt: string,
  startFrame?: ImageData,
  endFrame?: ImageData,
  config?: VideoGenerationConfig
): Promise<VideoData> => {
  const aspectRatio = mapVideoAspectRatio(config?.aspectRatio || '16:9');
  const resolution = mapVideoResolution(config?.resolution || '720p');
  const interpolating = !!(startFrame && endFrame);
  const maxSeconds = interpolating ? VIDEO_MAX_SECONDS_WITH_END_FRAME : VIDEO_MAX_SECONDS;
  const durationSeconds = Math.min(
    maxSeconds,
    Math.max(VIDEO_MIN_SECONDS, Math.round(config?.durationSeconds ?? VIDEO_DEFAULT_SECONDS))
  );

  // Input images. The model reads each image's role from the prompt, so the prompt names them.
  // Interpolation takes exactly two frames, so character references are only sent without an end frame.
  const frames = [startFrame, endFrame].filter((f): f is ImageData => !!f?.base64);
  const requestedReferences = (config?.referenceImages ?? []).filter((img): img is ImageData => !!img?.base64);
  const references = interpolating ? [] : requestedReferences.slice(0, VIDEO_MAX_IMAGES - frames.length);
  if (references.length < requestedReferences.length) {
    console.warn(`[video] sending ${references.length} of ${requestedReferences.length} reference images (limit ${VIDEO_MAX_IMAGES} images; none with an end frame)`);
  }

  const roleNotes: string[] = [];
  let imageCount = 0;
  if (startFrame?.base64) roleNotes.push(`Image ${++imageCount} is the opening frame of the video.`);
  if (endFrame?.base64) roleNotes.push(`Image ${++imageCount} is the closing frame of the video.`);
  if (references.length === 1) {
    roleNotes.push(`Image ${++imageCount} is a character reference: keep that character's face, hair, build and clothing identical to it.`);
  } else if (references.length > 1) {
    const first = imageCount + 1;
    imageCount += references.length;
    roleNotes.push(`Images ${first} to ${imageCount} are character references: keep each character's face, hair, build and clothing identical to their reference.`);
  }

  let text = `Create a cinematic ${durationSeconds}-second video. ${prompt}. Professional quality, smooth motion, ${aspectRatio} format.`;
  if (config?.negativePrompt) text += ` Avoid: ${config.negativePrompt}.`;
  if (roleNotes.length) text += ` ${roleNotes.join(' ')}`;

  const imageParts = [...frames, ...references].map(toInteractionImage);
  const task = startFrame && !endFrame && references.length === 0
    ? 'image_to_video'
    : !startFrame && !endFrame && references.length > 0
      ? 'reference_to_video'
      : undefined;

  const body: Record<string, unknown> = {
    model: VIDEO_MODEL,
    input: imageParts.length ? [...imageParts, { type: 'text', text }] : text,
    response_format: {
      type: 'video',
      aspect_ratio: aspectRatio,
      resolution,
      duration: `${durationSeconds}s`,
    },
    // Synchronous unary generation; store=false keeps the clip out of server-side history.
    background: false,
    store: false,
  };
  if (task) body.generation_config = { video_config: { task } };

  console.log('[video] generating with', VIDEO_MODEL, {
    aspectRatio,
    resolution,
    durationSeconds,
    frames: frames.length,
    references: references.length,
    task: task ?? 'inferred from prompt',
  });

  let response: Response;
  try {
    response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getApiKey() },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Video generation with ${VIDEO_MODEL} could not reach the Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }

  const payload: any = await response.json().catch(() => null);
  if (!response.ok) {
    const apiStatus = payload?.error?.status ? ` ${payload.error.status}` : '';
    const apiMessage = payload?.error?.message || response.statusText || 'no error message returned';
    throw new Error(`Video generation with ${VIDEO_MODEL} failed (HTTP ${response.status}${apiStatus}): ${apiMessage}`);
  }

  const video = findInteractionVideo(payload);
  if (video?.data) {
    const mimeType = video.mime_type || 'video/mp4';
    console.log(`[video] ${VIDEO_MODEL} returned ${mimeType}, ${Math.round((video.data.length * 3) / 4 / 1024)} KB`);
    return {
      // A data URL keeps the clip playable after reload (clips persist in IndexedDB) and never
      // puts the API key in a URL.
      url: `data:${mimeType};base64,${video.data}`,
      status: 'completed',
      mimeType,
    };
  }

  const modelText = collectInteractionText(payload);
  const detail = video?.uri
    ? 'it returned a file link instead of inline video'
    : `interaction status: ${payload?.status ?? 'unknown'}`;
  console.error(`[video] ${VIDEO_MODEL} returned no video (${detail})`, modelText);
  return {
    status: 'failed',
    mimeType: 'video/mp4',
    error: `${VIDEO_MODEL} returned no video (${detail})${modelText ? `: ${modelText}` : ''}`,
  };
};

// Clips created before the switch hold a serialized Veo long-running operation. Veo is not served
// on this account, so those operations cannot be resumed; Gemini Omni never needs polling.
export const pollVideoOperation = async (operationId: string): Promise<VideoData> => {
  console.warn('[video] cannot poll a legacy Veo operation; Veo is no longer served on this account');
  return {
    operationId,
    status: 'failed',
    mimeType: 'video/mp4',
    error: `This clip was started on Veo, which this account no longer serves. Generate it again: videos now come from ${VIDEO_MODEL} in a single request.`,
  };
};

export const generateVideoFromScenes = async (
  startScene: Scene,
  endScene: Scene,
  description: string,
  config?: VideoGenerationConfig
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();
  
  // ✅ ENHANCED: Apply same resolution validation for scene-to-video generation
  const requestedAspectRatio = config?.aspectRatio || '16:9';
  const normalizedAspectRatio = mapVideoAspectRatio(requestedAspectRatio);
  const defaultResolution = normalizedAspectRatio === '9:16' ? '720p' : '1080p';
  const requestedResolution = config?.resolution || defaultResolution;
  const validatedResolution = (normalizedAspectRatio === '9:16' && requestedResolution === '1080p') ? '720p' : requestedResolution;

  const videoClip: VideoClip = {
    id: clipId,
    description,
    startFrameId: startScene.id,
    endFrameId: endScene.id,
    videoData: null,
    aspectRatio: normalizedAspectRatio,
    resolution: validatedResolution,
    createdAt: new Date()
  };

  try {
    const requestConfig: VideoGenerationConfig = {
      aspectRatio: normalizedAspectRatio,
      resolution: validatedResolution,
      negativePrompt: config?.negativePrompt,
      personGeneration: config?.personGeneration,
      durationSeconds: config?.durationSeconds,
    };
    // Generate the video using both scenes as frames
    const videoData = await generateVideoClip(
      description,
      startScene.imageData,
      endScene.imageData,
      requestConfig
    );
    
    videoClip.videoData = videoData;
    
    // Save to IndexedDB
    await addVideoClipToDB(videoClip);
    
    return videoClip;
  } catch (error) {
    console.error('Scene-to-video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

// Simplified function for generating video from a single scene
export const generateVideoFromSingleScene = async (
  scene: Scene,
  description: string,
  config?: VideoGenerationConfig
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();
  
  // ✅ ENHANCED: Apply same resolution validation for single scene generation
  const requestedAspectRatio = config?.aspectRatio || '16:9';
  const normalizedAspectRatio = mapVideoAspectRatio(requestedAspectRatio);
  const defaultResolution = normalizedAspectRatio === '9:16' ? '720p' : '1080p';
  const requestedResolution = config?.resolution || defaultResolution;
  const validatedResolution = (normalizedAspectRatio === '9:16' && requestedResolution === '1080p') ? '720p' : requestedResolution;

  const videoClip: VideoClip = {
    id: clipId,
    description,
    startFrameId: scene.id,
    endFrameId: undefined, // No end frame for single scene animation
    videoData: null,
    aspectRatio: normalizedAspectRatio,
    resolution: validatedResolution,
    createdAt: new Date()
  };
  
  try {
    const requestConfig: VideoGenerationConfig = {
      aspectRatio: normalizedAspectRatio,
      resolution: validatedResolution,
      negativePrompt: config?.negativePrompt,
      personGeneration: config?.personGeneration,
      durationSeconds: config?.durationSeconds,
    };
    // Generate the video using the single scene as starting frame
    const videoData = await generateVideoClip(
      description,
      scene.imageData, // Only provide the single scene as start frame
      undefined, // No end frame
      requestConfig
    );
    
    videoClip.videoData = videoData;
    
    // Save to IndexedDB
    await addVideoClipToDB(videoClip);
    
    return videoClip;
  } catch (error) {
    console.error('Single scene video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

// Enhanced scene generation with intelligent lighting and environmental context
const inferLightingFromScene = (description: string): string => {
  const desc = description.toLowerCase();
  
  if (desc.includes('outdoor') || desc.includes('park') || desc.includes('street') || desc.includes('garden')) {
    return 'LIGHTING: Natural daylight with realistic sky illumination. Use golden hour warmth if appropriate, or bright diffused daylight. Show natural shadows and atmospheric perspective with authentic outdoor light quality.';
  }
  
  if (desc.includes('indoor') || desc.includes('office') || desc.includes('room') || desc.includes('house')) {
    return 'LIGHTING: Interior lighting appropriate to the space - warm tungsten for homes (2700K), cool fluorescent for offices (4000K), or mixed lighting for public spaces. Include realistic light sources and their natural falloff patterns.';
  }
  
  if (desc.includes('evening') || desc.includes('night') || desc.includes('sunset')) {
    return 'LIGHTING: Ambient evening light with warm artificial sources (2200K-2700K). Show realistic light falloff and atmospheric depth with subtle cool shadows. Include practical light sources like street lamps or window glow.';
  }
  
  if (desc.includes('morning') || desc.includes('sunrise') || desc.includes('dawn')) {
    return 'LIGHTING: Soft morning light with cool-to-warm transition (3200K-5600K). Show gentle directional shadows and fresh, clear atmosphere with natural light progression.';
  }
  
  if (desc.includes('dramatic') || desc.includes('intense') || desc.includes('conflict')) {
    return 'LIGHTING: Cinematic lighting with strong directional elements. Use dramatic contrast while maintaining natural believability - think professional film lighting with motivated sources.';
  }
  
  return 'LIGHTING: Balanced natural lighting that complements the scene\'s mood. Use realistic light sources with proper shadows, natural color temperature, and atmospheric effects that support the narrative.';
};

const buildEnvironmentalNarrative = (description: string): string => {
  const desc = description.toLowerCase();
  const baseNarrative = `SCENE CONTEXT: ${description}`;
  
  if (desc.includes('office') || desc.includes('workplace') || desc.includes('meeting')) {
    return `${baseNarrative} This professional environment shows authentic workplace details - realistic furniture with natural wear, proper ergonomic setup, technology that appears genuinely used rather than staged, papers and objects that suggest actual work happening.`;
  }
  
  if (desc.includes('outdoor') || desc.includes('nature') || desc.includes('park')) {
    return `${baseNarrative} This natural environment displays authentic outdoor conditions - realistic weather effects, natural ground textures with organic irregularities, vegetation showing seasonal characteristics, environmental elements that interact naturally with the lighting.`;
  }
  
  if (desc.includes('home') || desc.includes('house') || desc.includes('kitchen') || desc.includes('living')) {
    return `${baseNarrative} This domestic space feels genuinely lived-in - furniture shows natural wear patterns, personal belongings are arranged organically, lighting comes from practical sources like lamps or windows, surfaces show realistic use and patina.`;
  }
  
  return `${baseNarrative} This environment feels authentic and lived-in, with realistic details that support the narrative rather than generic placeholder elements. Every surface, object, and spatial relationship should suggest genuine use and natural placement.`;
};

// ✅ ENHANCED: Improved camera angle guidance following Gemini 3 Pro Image best practices
const determineCameraAngle = (description: string, aspectRatio: string): string => {
  const aspectInstructions: Record<string, string> = {
    '16:9': 'CINEMATIC CAMERA WORK: Use professional wide-screen cinematography with 24-35mm equivalent lens for expansive environmental storytelling. Position camera at natural eye level with slight adjustments for narrative impact. Create depth through layered composition that guides the eye across the wide frame, utilizing the panoramic view to establish context and relationships between subjects and environment.',
    '9:16': 'VERTICAL STORYTELLING: Employ portrait-oriented cinematography with 50-85mm equivalent lens that maximizes vertical narrative space. Frame from a natural human perspective that emphasizes the full height of the scene, creating compelling top-to-bottom visual flow. Use vertical leading lines and layered depth to draw viewers through the tall frame, perfect for character-focused storytelling with rich environmental context.',
    '1:1': 'BALANCED COMPOSITION: Utilize harmonious square framing with 50mm equivalent lens that creates equal visual weight in all directions. Center the narrative focus while maintaining perfect symmetry or intentional asymmetry within the square bounds. Use circular, spiral, or diagonal compositions that naturally complement the square format, creating intimate yet complete storytelling.'
  };

  const baseCamera = aspectInstructions[aspectRatio] || aspectInstructions['1:1'];
  const desc = description.toLowerCase();

  if (desc.includes('conversation') || desc.includes('meeting') || desc.includes('discussion')) {
    return `${baseCamera} Focus on capturing authentic interpersonal dynamics with natural body language, genuine eye contact, and spatial relationships that reveal the emotional subtext of the interaction. Show how people naturally occupy and share space during meaningful exchanges.`;
  }

  if (desc.includes('action') || desc.includes('movement') || desc.includes('walking') || desc.includes('running')) {
    return `${baseCamera} Capture the peak moment of motion with realistic body mechanics, natural movement blur where appropriate, and environmental interaction that shows the physical relationship between moving subjects and their surroundings. Freeze the decisive moment that tells the story of the movement.`;
  }

  return `${baseCamera} Frame this scene with documentary authenticity, as if capturing a spontaneous moment of real life. Show natural, unposed interactions between subjects and their environment, revealing the authentic story through genuine human behavior and environmental details.`;
};

// ✅ ENHANCED: Create more substantial aspect ratio reference images with visual content
const createAspectRatioReference = (ratio: string): { base64: string, mimeType: string } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Set dimensions based on aspect ratio (using larger, more definitive sizes)
  switch(ratio) {
    case '16:9':
      canvas.width = 1920;
      canvas.height = 1080;
      break;
    case '9:16':
      canvas.width = 1080;
      canvas.height = 1920;
      break;
    case '1:1':
    default:
      canvas.width = 1024;
      canvas.height = 1024;
      break;
  }

  // Create more substantial visual content to enforce aspect ratio
  // Fill with contrasting colors to make the aspect ratio unmistakable
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#4a90e2'); // Strong blue
  gradient.addColorStop(0.5, '#f5f5f5'); // Light gray
  gradient.addColorStop(1, '#4a90e2'); // Strong blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add strong border frame to define aspect ratio
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Add aspect ratio text overlay to make the format obvious
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${ratio} ASPECT RATIO TEMPLATE`,
    canvas.width / 2,
    canvas.height / 2
  );

  // Add dimension indicators in corners
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${canvas.width}x${canvas.height}`, 20, 40);

  // Convert to base64
  const dataURL = canvas.toDataURL('image/png', 0.9); // Higher quality
  const base64 = dataURL.split(',')[1];

  return {
    base64,
    mimeType: 'image/png'
  };
};

export const generateSceneImage = async (
    entities: Character[],
    sceneDescription: string,
    aspectRatio: string,
    generationMode: 'character' | 'object'
  ): Promise<ImageData> => {

    // ✅ SIMPLIFIED: Use direct, simple aspect ratio terms (more effective than complex instructions)
    const getSimpleAspectRatioPrompt = (ratio: string): string => {
      switch(ratio) {
        case '16:9':
          return 'Generate a landscape image. Wide cinematic format.';
        case '9:16':
          return 'Generate a portrait image. Tall vertical format.';
        case '1:1':
        default:
          return 'Generate a square image.';
      }
    }
    
    // ✅ CRITICAL FIX: Add reference image with correct aspect ratio (Gemini 3 Pro Image supports up to 14 reference inputs)
    const aspectReferenceImage = createAspectRatioReference(aspectRatio);
    const aspectRatioPrompt = getSimpleAspectRatioPrompt(aspectRatio);

    // Generate intelligent lighting, environment, and camera guidance
    const lightingGuidance = inferLightingFromScene(sceneDescription);
    const environmentalContext = buildEnvironmentalNarrative(sceneDescription);
    const cameraGuidance = determineCameraAngle(sceneDescription, aspectRatio);
    const entityType = generationMode === 'character' ? 'character' : 'object';

    // Create narrative descriptions for each entity with enhanced storytelling
    const entityNarratives = entities.map((entity, index) => {
        const entityNumber = entities.length > 1 ? ` (the ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : `${index + 1}th`} ${entityType})` : '';
        return `${entity.name}${entityNumber} appears naturally within this environment, maintaining their exact visual identity from the reference while being authentically integrated into the scene's lighting and atmosphere. Their ${entity.description.toLowerCase()} characteristics remain unchanged while they interact naturally with this space.`;
    }).join(' ');

    // ✅ AGGRESSIVE: Multi-technique aspect ratio enforcement
    const aspectRatioInstructions = aspectRatio === '16:9'
      ? 'CRITICAL ASPECT RATIO REQUIREMENT: This image MUST be generated in 16:9 landscape format. Width must be significantly wider than height, like a widescreen cinema format (1920x1080 proportions). Do not generate a square image. Generate a landscape image.'
      : aspectRatio === '9:16'
      ? 'CRITICAL ASPECT RATIO REQUIREMENT: This image MUST be generated in 9:16 portrait format. Height must be significantly taller than width, like a mobile phone screen (1080x1920 proportions). Do not generate a square image. Generate a portrait image.'
      : 'CRITICAL ASPECT RATIO REQUIREMENT: This image MUST be generated in 1:1 square format. Width and height must be exactly equal. Generate a square image.';

    const prompt = `${aspectRatioInstructions}

${aspectRatioPrompt}

MANDATORY: Follow the exact aspect ratio and dimensions of the reference template image provided. The output image must match these dimensions precisely.

SCENE DESCRIPTION: ${environmentalContext} This photorealistic scene captures ${entityNarratives} The narrative shows ${sceneDescription}.

${lightingGuidance}

${cameraGuidance}

ASPECT RATIO VERIFICATION: Before generating, confirm the output will be ${aspectRatio} format (${aspectRatio === '16:9' ? 'wide landscape' : aspectRatio === '9:16' ? 'tall portrait' : 'perfect square'}).

Create a professional photograph with realistic details, natural lighting, and authentic textures. Each ${entityType} must preserve their exact visual identity from their reference images.

FINAL REMINDER: Generate this as ${aspectRatio === '16:9' ? 'landscape (wide)' : aspectRatio === '9:16' ? 'portrait (tall)' : 'square'} format only.`;

    // ✅ CRITICAL: Build parts array with aspect ratio reference LAST (Gemini 3 Pro Image uses enhanced compositional reasoning)
    const parts: Part[] = [];

    // Add entity reference images first
    entities
      .filter(entity => entity.imageData)
      .forEach(entity => {
        parts.push({
          inlineData: { data: entity.imageData!.base64, mimeType: entity.imageData!.mimeType },
        });
      });

    // Add aspect ratio reference image LAST (this determines the output aspect ratio)
    parts.push({
      inlineData: {
        data: aspectReferenceImage.base64,
        mimeType: aspectReferenceImage.mimeType
      }
    });

    // Add prompt text last
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    const rawImage = extractImageData(response);
    const adjustedImage = await enforceAspectRatio(rawImage, aspectRatio);
    return adjustedImage;
};

// ============================================================================
// NEW AUDIO-TO-VIDEO FUNCTIONS FOR VEO 3.1 INTEGRATION
// These functions are completely additive and do not modify existing functionality
// ============================================================================

import {
  AudioFeatures,
  SceneBreakpoint,
  TimedAction,
  audioAnalysisService
} from './audioAnalysisService';

/**
 * Generate a video synchronized with audio features
 * This is a NEW function that does not modify existing video generation
 */
export const generateAudioSyncVideo = async (
  characters: Character[],
  audioFeatures: AudioFeatures,
  breakpoints: SceneBreakpoint[],
  promptOverride?: string
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();

  // Build a prompt that incorporates audio rhythm and mood
  const audioMoodDescription = audioFeatures.spectralCentroid > 0.5
    ? 'energetic and bright'
    : 'calm and mellow';

  const beatDescription = audioFeatures.beatTimings.length > audioFeatures.duration * 2
    ? 'rhythmic and fast-paced'
    : 'slow and contemplative';

  const characterDescriptions = characters.map(c => c.name).join(', ');

  const prompt = promptOverride || `
    Create a video featuring ${characterDescriptions} that matches the ${audioMoodDescription} mood
    with ${beatDescription} movement. The characters should move and express emotions
    in sync with the audio's rhythm and intensity.
  `;

  // Use the first breakpoint to generate an 8-second segment
  const firstBreakpoint = breakpoints[0];
  const enhancedPrompt = `${prompt} ${firstBreakpoint.suggestedAction}`;

  // Create video clip object
  const videoClip: VideoClip = {
    id: clipId,
    description: `Audio-synced video: ${enhancedPrompt}`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      audioSync: true,
      audioFeatures: {
        duration: audioFeatures.duration,
        beatCount: audioFeatures.beatTimings.length,
        intensity: firstBreakpoint.intensity
      }
    }
  };

  try {
    // Generate video using existing function with audio-aware prompt
    const videoData = await generateVideoClip(
      enhancedPrompt,
      undefined,
      undefined,
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8,
        referenceImages: characterReferenceImages(characters)
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Audio sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

/**
 * Generate a dialogue-synchronized video
 * Dialogue (speech) comes from the video model's native audio
 */
export const generateDialogueSyncVideo = async (
  characters: Character[],
  audioFeatures: AudioFeatures,
  transcript: string,
  breakpoints: SceneBreakpoint[]
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();

  // Parse dialogue for the first 8 seconds
  const wordsPerSecond = transcript.split(' ').length / audioFeatures.duration;
  const firstSegmentWords = Math.floor(wordsPerSecond * 8);
  const dialogueSegment = transcript.split(' ').slice(0, firstSegmentWords).join(' ');

  const characterName = characters[0]?.name || 'Character';

  // Create dialogue-aware prompt with dialogue cues
  const prompt = `
    Character ${characterName} speaking with natural lip-sync and facial expressions.

    DIALOGUE CUE: "${dialogueSegment}"

    The character should:
    - Move their lips naturally to match the dialogue
    - Show appropriate facial expressions
    - Use natural hand gestures while speaking
    - Maintain eye contact with the viewer

    Setting: Professional studio environment with good lighting.
  `;

  const videoClip: VideoClip = {
    id: clipId,
    description: `Dialogue video: ${characterName} speaking`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      dialogueSync: true,
      transcript: dialogueSegment,
      character: characterName
    }
  };

  try {
    const videoData = await generateVideoClip(
      prompt,
      undefined,
      undefined,
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8,
        // Gemini Omni generates native audio, so the dialogue cue in the prompt drives the speech
        referenceImages: characterReferenceImages(characters.slice(0, 1))
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Dialogue sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

/**
 * Generate a music-synchronized video
 * This is a NEW function for music video generation
 */
export const generateMusicSyncVideo = async (
  characters: Character[],
  audioFeatures: AudioFeatures,
  breakpoints: SceneBreakpoint[],
  promptOverride?: string
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();

  // Analyze beat patterns for the first 8 seconds
  const beatsIn8Seconds = audioFeatures.beatTimings.filter(t => t <= 8000).length;
  const bpm = (beatsIn8Seconds / 8) * 60;

  // Determine dance/movement style based on BPM
  let movementStyle = 'gentle swaying';
  if (bpm > 140) movementStyle = 'energetic dancing';
  else if (bpm > 100) movementStyle = 'rhythmic movement';
  else if (bpm > 60) movementStyle = 'moderate dancing';

  const characterNames = characters.map(c => c.name).join(' and ');

  const prompt = promptOverride || `
    ${characterNames} performing ${movementStyle} synchronized to music.

    The characters should:
    - Move in perfect rhythm with the beat (approximately ${Math.round(bpm)} BPM)
    - Show joyful expressions matching the music's energy
    - Use natural, fluid body movements
    - Interact with each other if multiple characters

    Style: ${breakpoints[0]?.sceneType === 'climax' ? 'High energy performance' :
            breakpoints[0]?.sceneType === 'energetic' ? 'Upbeat and lively' :
            breakpoints[0]?.sceneType === 'calm' ? 'Smooth and graceful' :
            'Natural and expressive'}

    Setting: ${bpm > 120 ? 'Dynamic performance space' : 'Comfortable environment'}
  `;

  const videoClip: VideoClip = {
    id: clipId,
    description: `Music video: ${characterNames} dancing to ${Math.round(bpm)} BPM`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      musicSync: true,
      bpm: Math.round(bpm),
      movementStyle,
      beatCount: beatsIn8Seconds
    }
  };

  try {
    const videoData = await generateVideoClip(
      prompt,
      undefined,
      undefined,
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8,
        referenceImages: characterReferenceImages(characters)
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Music sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

/**
 * Helper function to build Veo 3.1-specific prompts
 * This is preparatory for when Veo 3.1 becomes available
 */
export const buildVeo31AudioPrompt = (
  basePrompt: string,
  audioContext?: {
    hasDialogue?: boolean;
    dialogueText?: string;
    hasSoundEffects?: boolean;
    soundDescription?: string;
    musicGenre?: string;
  }
): string => {
  let enhancedPrompt = basePrompt;

  if (audioContext?.hasDialogue && audioContext.dialogueText) {
    enhancedPrompt += `\n\nDIALOGUE CUE: Character says "${audioContext.dialogueText}" with natural lip-sync.`;
  }

  if (audioContext?.hasSoundEffects && audioContext.soundDescription) {
    enhancedPrompt += `\n\nSOUND EFFECTS: Include ${audioContext.soundDescription}`;
  }

  if (audioContext?.musicGenre) {
    enhancedPrompt += `\n\nMUSIC: ${audioContext.musicGenre} soundtrack that matches the scene mood.`;
  }

  return enhancedPrompt;
};

// ============================================================================
// SCENE-BASED AUDIO-TO-VIDEO FUNCTIONS
// These use scenes (composed images) instead of individual characters
// ============================================================================

/**
 * Generate audio-synced video from a scene
 */
export const generateAudioSyncVideoFromScene = async (
  scenes: Scene[],
  audioFeatures: AudioFeatures,
  breakpoints: SceneBreakpoint[],
  promptOverride?: string
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();
  const primaryScene = scenes[0]; // Use first selected scene

  // Build a prompt that incorporates audio rhythm and mood
  const audioMoodDescription = audioFeatures.spectralCentroid > 0.5
    ? 'energetic and bright'
    : 'calm and mellow';

  const beatDescription = audioFeatures.beatTimings.length > audioFeatures.duration * 2
    ? 'rhythmic and fast-paced'
    : 'slow and contemplative';

  // Simplified prompt to avoid safety filter false positives
  const prompt = promptOverride || `
    Create a professional video animation.
    Scene: ${primaryScene.description}
    Style: ${audioMoodDescription} atmosphere with ${beatDescription} pacing.
    Animation: Natural movement and smooth transitions over 8 seconds.
  `;

  const firstBreakpoint = breakpoints[0];
  const enhancedPrompt = `${prompt} ${firstBreakpoint?.suggestedAction || ''}`;

  const videoClip: VideoClip = {
    id: clipId,
    description: `Audio-synced scene: ${primaryScene.description}`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      audioSync: true,
      audioFeatures: {
        duration: audioFeatures.duration,
        beatCount: audioFeatures.beatTimings.length,
        intensity: firstBreakpoint?.intensity || 0.5
      }
    }
  };

  try {
    // Use the scene's image as the starting point
    const videoData = await generateVideoClip(
      enhancedPrompt,
      primaryScene.imageData, // Use scene image instead of character
      scenes.length > 1 ? scenes[1].imageData : undefined, // Optional second scene as end frame
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Audio sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

/**
 * Generate dialogue-synced video from a scene
 */
export const generateDialogueSyncVideoFromScene = async (
  scenes: Scene[],
  audioFeatures: AudioFeatures,
  transcript: string,
  breakpoints: SceneBreakpoint[]
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();
  const primaryScene = scenes[0];

  // Parse dialogue for the first 8 seconds
  const wordsPerSecond = transcript.split(' ').length / audioFeatures.duration;
  const firstSegmentWords = Math.floor(wordsPerSecond * 8);
  const dialogueSegment = transcript.split(' ').slice(0, firstSegmentWords).join(' ');

  // Include dialogue in a way that won't trigger safety filters
  // Present it as animation direction rather than explicit dialogue
  const prompt = `
    Create a professional video animation of this scene.
    Scene description: ${primaryScene.description}

    The person in the scene is speaking these words: "${dialogueSegment}"

    Animation requirements:
    - Natural speaking gestures and lip movement
    - Facial expressions that match the tone of the words
    - Professional body language while speaking
    - Smooth camera work focused on the speaker

    The character should appear to be naturally speaking the provided text.
    Duration: 8 seconds of smooth, cinematic motion.
  `;

  const videoClip: VideoClip = {
    id: clipId,
    description: `Dialogue scene: ${primaryScene.description}`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      dialogueSync: true,
      transcript: dialogueSegment
    }
  };

  try {
    const videoData = await generateVideoClip(
      prompt,
      primaryScene.imageData,
      undefined,
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Dialogue sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};

/**
 * Generate music-synced video from a scene
 */
export const generateMusicSyncVideoFromScene = async (
  scenes: Scene[],
  audioFeatures: AudioFeatures,
  breakpoints: SceneBreakpoint[],
  promptOverride?: string
): Promise<VideoClip> => {
  const clipId = crypto.randomUUID();
  const primaryScene = scenes[0];

  // Analyze beat patterns for the first 8 seconds
  const beatsIn8Seconds = audioFeatures.beatTimings.filter(t => t <= 8000).length;
  const bpm = (beatsIn8Seconds / 8) * 60;

  // Determine movement style based on BPM
  let movementStyle = 'gentle animation';
  if (bpm > 140) movementStyle = 'energetic, fast-paced animation';
  else if (bpm > 100) movementStyle = 'rhythmic, upbeat animation';
  else if (bpm > 60) movementStyle = 'moderate, flowing animation';

  const prompt = promptOverride || `
    Animate this scene with ${movementStyle} synchronized to music.
    Scene: ${primaryScene.description}

    Animation requirements:
    - Elements should move in rhythm with the beat (approximately ${Math.round(bpm)} BPM)
    - Characters should show expressions matching the music's energy
    - Use dynamic camera movements that follow the rhythm
    - Add particle effects or environmental animations if appropriate

    Style: ${breakpoints[0]?.sceneType === 'climax' ? 'High energy with dramatic movements' :
            breakpoints[0]?.sceneType === 'energetic' ? 'Upbeat and lively animations' :
            breakpoints[0]?.sceneType === 'calm' ? 'Smooth and graceful transitions' :
            'Natural and expressive movement'}
  `;

  const videoClip: VideoClip = {
    id: clipId,
    description: `Music video: ${primaryScene.description} at ${Math.round(bpm)} BPM`,
    videoData: null,
    aspectRatio: '16:9',
    resolution: '1080p',
    createdAt: new Date(),
    metadata: {
      musicSync: true,
      bpm: Math.round(bpm),
      movementStyle,
      beatCount: beatsIn8Seconds
    }
  };

  try {
    const videoData = await generateVideoClip(
      prompt,
      primaryScene.imageData,
      scenes.length > 1 ? scenes[1].imageData : undefined,
      {
        aspectRatio: '16:9',
        resolution: '1080p',
        durationSeconds: 8
      }
    );

    videoClip.videoData = videoData;
    await addVideoClipToDB(videoClip);

    return videoClip;
  } catch (error) {
    console.error('Music sync video generation error:', error);
    videoClip.videoData = {
      status: 'failed',
      mimeType: 'video/mp4',
      error: error instanceof Error ? error.message : String(error)
    };
    await addVideoClipToDB(videoClip);
    return videoClip;
  }
};
