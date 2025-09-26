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

// Enhanced prompt building system based on Google Gemini 2.5 Flash best practices
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
    model: 'gemini-2.5-flash-image-preview',
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
        model: 'gemini-2.5-flash-image-preview',
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
        model: 'gemini-2.5-flash-image-preview',
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
        model: 'gemini-2.5-flash-image-preview',
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

export const generateVideoClip = async (
  prompt: string,
  startFrame?: ImageData,
  endFrame?: ImageData,
  config?: VideoGenerationConfig
): Promise<VideoData> => {
  // ✅ ENHANCED: Validate resolution constraints per Veo 3 documentation
  const requestedAspectRatio = config?.aspectRatio || '16:9';
  const normalizedAspectRatio = mapVideoAspectRatio(requestedAspectRatio);
  const defaultResolution = normalizedAspectRatio === '9:16' ? '720p' : '1080p'; // 9:16 only supports 720p

  const requestedResolution = config?.resolution || defaultResolution;
  let normalizedResolution = mapVideoResolution(requestedResolution);

  if (normalizedAspectRatio === '9:16' && normalizedResolution === '1080p') {
    console.warn('⚠️ Veo 3: 9:16 aspect ratio only supports 720p resolution. Adjusting to 720p.');
    normalizedResolution = '720p';
  }

  const durationSeconds = config?.durationSeconds ?? 8;

  const videoParameters: Record<string, unknown> = {
    aspectRatio: normalizedAspectRatio,
    resolution: normalizedResolution,
    durationSeconds,
  };

  if (config?.personGeneration) {
    videoParameters.personGeneration = config.personGeneration;
  }
  if (config?.negativePrompt) {
    videoParameters.negativePrompt = config.negativePrompt;
  }

  // ✅ FIXED: Build enhanced prompt without referencing images (inputMedia not supported)
  // Since Veo 3 doesn't support inputMedia, we create detailed text descriptions instead
  let enhancedPrompt = `Create a cinematic 8-second video that ${prompt}. Ensure smooth motion, natural lighting, and cinematic quality throughout the ${normalizedAspectRatio} video.`;

  // Note: startFrame and endFrame parameters are kept for future compatibility but not used in the API request
  // The Gemini API Veo 3 model generates videos from text prompts only

  try {
    console.log('🎬 Starting video generation with Veo 3 API');
    console.log('📝 Enhanced prompt:', enhancedPrompt);
    console.log('⚙️ Video config:', {
      aspectRatio: normalizedAspectRatio,
      resolution: normalizedResolution,
      hasStartFrame: !!startFrame,
      hasEndFrame: !!endFrame
    });

    // ✅ CORRECTED: Use proper Veo 3 API format based on official documentation
    const apiKey = getApiKey();

    // ✅ CORRECTED: Use proper Veo 3 stable API format (veo-3.0-generate-001) based on official documentation
    const requestBody: any = {
      instances: [{
        prompt: enhancedPrompt
      }],
      parameters: videoParameters
    };

    console.log('🎬 Veo 3 API Request Configuration:', {
      model: 'veo-3.0-generate-001',
      aspectRatio: videoParameters.aspectRatio,
      resolution: videoParameters.resolution,
      promptLength: enhancedPrompt.length,
      hasStartFrame: !!startFrame
    });

    // ✅ FIXED: Use correct Veo 3 image parameter format - bytesBase64Encoded instead of inlineData
    if (startFrame) {
      requestBody.instances[0].image = {
        bytesBase64Encoded: startFrame.base64,
        mimeType: startFrame.mimeType
      };
      console.log('🖼️ Using image-to-video generation with Veo 3 format');
    } else {
      console.log('📝 Using text-to-video generation');
    }

    console.log('🌐 Using Veo 3 with correct Vertex AI format');

    // Use predictLongRunning for Veo 3 operations (this is the correct endpoint)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001:predictLongRunning?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();

    console.log('🎬 Veo 3 predictLongRunning Response received - analyzing...');
    console.log('📊 Response data structure:', {
      hasData: !!responseData,
      responseKeys: Object.keys(responseData),
      hasName: !!responseData.name
    });

    // Extract operation ID from predictLongRunning response
    let operationId = null;

    // Look for operation name in the predictLongRunning response
    if (responseData.name) {
      console.log('🆔 Operation name found:', responseData.name);

      // Extract operation ID from the full operation name
      const operationMatch = responseData.name.match(/operations\/([a-zA-Z0-9-_]+)/);
      if (operationMatch) {
        operationId = operationMatch[1];
        console.log('🆔 Operation ID extracted:', operationId);
      } else {
        console.error('❌ Could not extract operation ID from operation name');
      }
    } else {
      console.error('❌ No operation name found in response');
    }

    console.log('🔍 Operation ID extracted from Veo 3 API:', {
      operationId: operationId || 'MISSING!',
      operationIdType: typeof operationId,
      operationIdLength: operationId ? operationId.length : 0,
      rawName: responseData.name,
      fullResponse: JSON.stringify(responseData, null, 2)
    });

    return {
      operationId,
      status: 'generating',
      mimeType: 'video/mp4'
    };
  } catch (error) {
    console.error('Video generation error:', error);
    throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const pollVideoOperation = async (operationId: string): Promise<VideoData> => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🎬 Polling video operation: ${operationId}`);

  try {
    // Poll the operation status using the stable Veo 3 model operations endpoint
    const apiKey = getApiKey();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001/operations/${operationId}?key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const operationData = await response.json();
    console.log(`[${timestamp}] 📊 Operation response:`, {
      done: operationData.done,
      hasError: !!operationData.error,
      hasResponse: !!operationData.response
    });

    if (operationData.done) {
      console.log(`[${timestamp}] ✅ Video generation completed for operation: ${operationId}`);

      if (operationData.error) {
        console.error(`[${timestamp}] ❌ Video generation failed:`, operationData.error);
        throw new Error(`Video generation failed: ${operationData.error.message}`);
      }

      // Extract the video data from the long-running operation response
      if (operationData.response) {
        const response_content = operationData.response;
        console.log(`[${timestamp}] 🎥 Video response found:`, response_content);

        // Check generateVideoResponse format (actual Veo 3 response format)
        if (response_content.generateVideoResponse) {
          const genResponse = response_content.generateVideoResponse;
          if (genResponse.generatedSamples && genResponse.generatedSamples.length > 0) {
            const sample = genResponse.generatedSamples[0];
            if (sample.video && sample.video.uri) {
              const rawVideoUrl = sample.video.uri;
              const videoUrlWithKey = addApiKeyToVideoUrl(rawVideoUrl);

              console.log(`[${timestamp}] 🎉 Video URL extracted from generateVideoResponse:`, {
                rawUrl: rawVideoUrl,
                urlWithKey: videoUrlWithKey ? 'URL with key prepared' : 'No URL with key'
              });

              return {
                fileUri: sample.video.fileUri,
                url: videoUrlWithKey,
                mimeType: 'video/mp4',
                operationId,
                status: 'completed'
              };
            }
          }
        }

        // Look for video data in different possible response structures (fallback)
        if (response_content.predictions && response_content.predictions.length > 0) {
          const prediction = response_content.predictions[0];
          if (prediction.videoData) {
            const video_data = prediction.videoData;
            const videoUrlWithKey = addApiKeyToVideoUrl(video_data.url);

            console.log(`[${timestamp}] 🎉 Video data extracted from predictions:`, {
              fileUri: video_data.fileUri,
              url: videoUrlWithKey ? 'URL with key prepared' : 'No URL',
              mimeType: video_data.mimeType
            });
            return {
              fileUri: video_data.fileUri,
              url: videoUrlWithKey,
              mimeType: video_data.mimeType || 'video/mp4',
              operationId,
              status: 'completed'
            };
          } else if (prediction.videoUri) {
            const videoUrlWithKey = addApiKeyToVideoUrl(prediction.videoUri);
            console.log(`[${timestamp}] 🎉 Video URI found:`, videoUrlWithKey ? 'URL with key prepared' : 'No URL');
            return {
              url: videoUrlWithKey,
              mimeType: 'video/mp4',
              operationId,
              status: 'completed'
            };
          }
        } else if (response_content.candidates && response_content.candidates.length > 0) {
          const candidates = response_content.candidates;
          const videoData = candidates[0]?.content?.parts?.find((part: any) => part.videoData);

          if (videoData?.videoData) {
            const videoUrlWithKey = addApiKeyToVideoUrl(videoData.videoData.url);

            console.log(`[${timestamp}] 🎉 Video data extracted from candidates:`, {
              fileUri: videoData.videoData.fileUri,
              url: videoUrlWithKey ? 'URL with key prepared' : 'No URL',
              mimeType: videoData.videoData.mimeType
            });
            return {
              fileUri: videoData.videoData.fileUri,
              url: videoUrlWithKey,
              mimeType: videoData.videoData.mimeType || 'video/mp4',
              operationId,
              status: 'completed'
            };
          }
        }
      }

      console.error(`[${timestamp}] ❌ Operation completed but no video data found`);
      throw new Error('No video data found in completed operation');
    }

    // Still generating
    console.log(`[${timestamp}] ⏳ Video still generating for operation: ${operationId}`);
    return {
      operationId,
      status: 'generating',
      mimeType: 'video/mp4'
    };
  } catch (error) {
    console.error(`[${timestamp}] ❌ Video polling error for ${operationId}:`, error);
    return {
      operationId,
      status: 'failed',
      mimeType: 'video/mp4'
    };
  }
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
      mimeType: 'video/mp4'
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
      mimeType: 'video/mp4'
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

// ✅ ENHANCED: Improved camera angle guidance following Gemini 2.5 Flash best practices
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
    
    // ✅ CRITICAL FIX: Add reference image with correct aspect ratio (workaround for Gemini 2.5 Flash limitations)
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

    // ✅ CRITICAL: Build parts array with aspect ratio reference LAST (Gemini 2.5 Flash adopts aspect ratio of last image)
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
      model: 'gemini-2.5-flash-image-preview',
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
