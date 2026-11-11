
export interface ImageData {
  base64: string;
  mimeType: string;
}

export interface VideoData {
  fileUri?: string;
  url?: string;
  mimeType: string;
  operationId?: string;
  status?: 'generating' | 'completed' | 'failed';
  error?: string; // Added to store specific error messages like safety filter reasons
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imageData: ImageData | null;
}

export interface Scene {
  id: string;
  description: string;
  imageUrl: string;
  imageData?: ImageData;
  canUseAsVideoFrame?: boolean;
}

export interface VideoClip {
  id: string;
  description: string;
  startFrameId?: string;
  endFrameId?: string;
  videoData: VideoData | null;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  createdAt: Date;
  metadata?: {  // Optional metadata for new audio features
    audioSync?: boolean;
    dialogueSync?: boolean;
    musicSync?: boolean;
    transcript?: string;
    character?: string;
    bpm?: number;
    movementStyle?: string;
    beatCount?: number;
    audioFeatures?: {
      duration: number;
      beatCount: number;
      intensity: number;
    };
  };
}

export interface VideoGenerationConfig {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  prompt?: string;
  negativePrompt?: string;
  personGeneration?: string;
  seed?: number;
  startFrame?: ImageData;
  endFrame?: ImageData;
  durationSeconds?: number; // 3 to 15 seconds (3 to 10 with an end frame) on gemini-omni-1.2-flash
  referenceImages?: ImageData[]; // character or subject references, up to 6 images per request
}
