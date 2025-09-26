
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
  durationSeconds?: number;
}
