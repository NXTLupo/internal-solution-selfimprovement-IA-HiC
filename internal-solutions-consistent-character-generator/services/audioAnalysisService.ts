/**
 * Audio Analysis Service for Veo 3.1 Integration
 *
 * This is a NEW service that adds audio-to-video capabilities.
 * It does NOT modify any existing functionality.
 * All methods here are additive and optional.
 */

export interface AudioFeatures {
  duration: number;           // Total duration in seconds
  sampleRate: number;         // Sample rate in Hz
  peaks: number[];           // Audio peak timestamps
  beatTimings: number[];     // Detected beat timestamps in milliseconds
  volumeEnvelope: number[];  // Volume levels over time
  spectralCentroid: number;  // Frequency characteristic
  segments: AudioSegment[];  // 8-second segments for Veo processing
}

export interface AudioSegment {
  startTime: number;         // Start time in milliseconds
  endTime: number;          // End time in milliseconds
  avgIntensity: number;     // Average intensity 0-1
  hasSpeech: boolean;       // Contains speech/vocals
  transcript?: string;      // Transcribed text if speech detected
  suggestedAction: string;  // Suggested character action for this segment
}

export interface SceneBreakpoint {
  timestamp: number;         // Time in milliseconds
  intensity: number;        // Audio intensity at this point (0-1)
  suggestedAction: string;  // Suggested character action
  sceneType: 'calm' | 'energetic' | 'transitional' | 'climax';
}

export interface TimedAction {
  timestamp: number;         // In milliseconds
  action: 'speak' | 'gesture' | 'move' | 'emote' | 'dance';
  description: string;       // Detailed action description
  intensity: number;        // Action intensity (0-1)
}

export interface DialogueMapping {
  characterId: string;
  dialogueSegments: {
    text: string;
    startTime: number;
    endTime: number;
    emotion?: string;
  }[];
}

/**
 * Main audio analysis service class
 */
export class AudioAnalysisService {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context when needed
  }

  /**
   * Initialize audio context (call this when user interaction occurs)
   */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Main entry point: Analyze an audio file for video synchronization
   */
  async analyzeAudio(audioFile: File): Promise<AudioFeatures> {
    const audioContext = this.ensureAudioContext();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const features: AudioFeatures = {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      peaks: this.extractPeaks(audioBuffer),
      beatTimings: this.detectBeats(audioBuffer),
      volumeEnvelope: this.getVolumeEnvelope(audioBuffer),
      spectralCentroid: this.calculateSpectralCentroid(audioBuffer),
      segments: this.createSegments(audioBuffer)
    };

    return features;
  }

  /**
   * Extract audio peaks for visual synchronization
   */
  private extractPeaks(audioBuffer: AudioBuffer): number[] {
    const peaks: number[] = [];
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerPeak = Math.floor(sampleRate * 0.1); // Check every 100ms

    let maxPeak = 0;
    for (let i = 0; i < channelData.length; i++) {
      maxPeak = Math.max(maxPeak, Math.abs(channelData[i]));
    }

    const threshold = maxPeak * 0.7; // 70% of max as peak threshold

    for (let i = 0; i < channelData.length; i += samplesPerPeak) {
      const sample = Math.abs(channelData[i]);
      if (sample > threshold) {
        peaks.push((i / sampleRate) * 1000); // Convert to milliseconds
      }
    }

    return peaks;
  }

  /**
   * Detect beats in audio for rhythm synchronization
   */
  private detectBeats(audioBuffer: AudioBuffer): number[] {
    const beats: number[] = [];
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Simple onset detection (can be enhanced with more sophisticated algorithms)
    const windowSize = 2048;
    const hopSize = 512;
    let previousEnergy = 0;

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += channelData[i + j] * channelData[i + j];
      }

      // Detect sudden energy increase
      if (energy > previousEnergy * 1.5 && energy > 0.01) {
        beats.push((i / sampleRate) * 1000); // Convert to milliseconds
      }

      previousEnergy = energy;
    }

    // Filter beats to avoid too many close together
    const filteredBeats: number[] = [];
    let lastBeat = -200;
    for (const beat of beats) {
      if (beat - lastBeat > 200) { // Minimum 200ms between beats
        filteredBeats.push(beat);
        lastBeat = beat;
      }
    }

    return filteredBeats;
  }

  /**
   * Calculate volume envelope over time
   */
  private getVolumeEnvelope(audioBuffer: AudioBuffer): number[] {
    const envelope: number[] = [];
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows

    for (let i = 0; i < channelData.length; i += windowSize) {
      let sum = 0;
      const end = Math.min(i + windowSize, channelData.length);
      for (let j = i; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      envelope.push(sum / (end - i));
    }

    return envelope;
  }

  /**
   * Calculate spectral centroid (brightness of sound)
   */
  private calculateSpectralCentroid(audioBuffer: AudioBuffer): number {
    // Simplified spectral centroid calculation
    const channelData = audioBuffer.getChannelData(0);
    let sum = 0;
    let weightedSum = 0;

    for (let i = 0; i < channelData.length; i++) {
      const magnitude = Math.abs(channelData[i]);
      sum += magnitude;
      weightedSum += magnitude * i;
    }

    return sum > 0 ? weightedSum / sum : 0;
  }

  /**
   * Create 8-second segments for Veo 3.1 processing
   */
  private createSegments(audioBuffer: AudioBuffer): AudioSegment[] {
    const segments: AudioSegment[] = [];
    const duration = audioBuffer.duration * 1000; // Convert to milliseconds
    const segmentDuration = 8000; // 8 seconds in milliseconds
    const volumeEnvelope = this.getVolumeEnvelope(audioBuffer);

    for (let start = 0; start < duration; start += segmentDuration) {
      const end = Math.min(start + segmentDuration, duration);
      const segmentVolumes = volumeEnvelope.slice(
        Math.floor((start / duration) * volumeEnvelope.length),
        Math.floor((end / duration) * volumeEnvelope.length)
      );

      const avgIntensity = segmentVolumes.reduce((a, b) => a + b, 0) / segmentVolumes.length;

      segments.push({
        startTime: start,
        endTime: end,
        avgIntensity: Math.min(avgIntensity * 10, 1), // Normalize to 0-1
        hasSpeech: this.detectSpeechInSegment(audioBuffer, start, end),
        suggestedAction: this.suggestActionForIntensity(avgIntensity * 10)
      });
    }

    return segments;
  }

  /**
   * Detect if segment contains speech (simplified)
   */
  private detectSpeechInSegment(audioBuffer: AudioBuffer, startMs: number, endMs: number): boolean {
    // This is a simplified check - in production, use a proper VAD library
    const startSample = Math.floor((startMs / 1000) * audioBuffer.sampleRate);
    const endSample = Math.floor((endMs / 1000) * audioBuffer.sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Check for speech-like patterns (simplified)
    let crossings = 0;
    let previous = 0;
    for (let i = startSample; i < endSample && i < channelData.length; i++) {
      if ((previous < 0 && channelData[i] >= 0) || (previous >= 0 && channelData[i] < 0)) {
        crossings++;
      }
      previous = channelData[i];
    }

    // Speech typically has many zero crossings
    const crossingRate = crossings / (endSample - startSample);
    return crossingRate > 0.1 && crossingRate < 0.5;
  }

  /**
   * Suggest character action based on audio intensity
   */
  private suggestActionForIntensity(intensity: number): string {
    if (intensity < 0.2) return "subtle idle animation";
    if (intensity < 0.4) return "gentle swaying or nodding";
    if (intensity < 0.6) return "moderate movement or gesturing";
    if (intensity < 0.8) return "energetic dancing or expressive movement";
    return "intense dynamic action or dramatic gesture";
  }

  /**
   * Generate scene breakpoints based on audio features
   */
  generateSceneBreakpoints(features: AudioFeatures): SceneBreakpoint[] {
    const breakpoints: SceneBreakpoint[] = [];
    const { peaks, beatTimings, volumeEnvelope } = features;

    // Add breakpoints at significant audio events
    const significantPeaks = peaks.filter((peak, index) =>
      index === 0 || peak - peaks[index - 1] > 2000 // At least 2 seconds apart
    );

    for (const peak of significantPeaks) {
      const intensity = this.getIntensityAtTime(peak, volumeEnvelope, features.duration);
      breakpoints.push({
        timestamp: peak,
        intensity,
        suggestedAction: this.suggestActionForIntensity(intensity),
        sceneType: this.determineSceneType(intensity)
      });
    }

    // Add breakpoints at regular intervals if not enough peaks
    if (breakpoints.length < features.duration / 8000) {
      for (let t = 0; t < features.duration * 1000; t += 8000) {
        if (!breakpoints.some(bp => Math.abs(bp.timestamp - t) < 1000)) {
          const intensity = this.getIntensityAtTime(t, volumeEnvelope, features.duration);
          breakpoints.push({
            timestamp: t,
            intensity,
            suggestedAction: this.suggestActionForIntensity(intensity),
            sceneType: this.determineSceneType(intensity)
          });
        }
      }
    }

    return breakpoints.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get audio intensity at specific time
   */
  private getIntensityAtTime(timeMs: number, volumeEnvelope: number[], durationSec: number): number {
    const index = Math.floor((timeMs / (durationSec * 1000)) * volumeEnvelope.length);
    return Math.min(volumeEnvelope[Math.min(index, volumeEnvelope.length - 1)] * 10, 1);
  }

  /**
   * Determine scene type based on intensity
   */
  private determineSceneType(intensity: number): 'calm' | 'energetic' | 'transitional' | 'climax' {
    if (intensity < 0.3) return 'calm';
    if (intensity < 0.5) return 'transitional';
    if (intensity < 0.8) return 'energetic';
    return 'climax';
  }

  /**
   * Map dialogue to timestamps for character synchronization
   */
  mapDialogueToTimestamps(transcript: string, audioFeatures: AudioFeatures): TimedAction[] {
    const actions: TimedAction[] = [];
    const words = transcript.split(' ');
    const timePerWord = (audioFeatures.duration * 1000) / words.length;

    words.forEach((word, index) => {
      const timestamp = index * timePerWord;
      actions.push({
        timestamp,
        action: 'speak',
        description: `Character says: "${word}"`,
        intensity: this.getIntensityAtTime(timestamp, audioFeatures.volumeEnvelope, audioFeatures.duration)
      });
    });

    return actions;
  }

  /**
   * Generate music synchronization actions
   */
  generateMusicSyncActions(audioFeatures: AudioFeatures): TimedAction[] {
    const actions: TimedAction[] = [];

    // Add actions at beat timings
    for (const beat of audioFeatures.beatTimings) {
      const intensity = this.getIntensityAtTime(beat, audioFeatures.volumeEnvelope, audioFeatures.duration);
      actions.push({
        timestamp: beat,
        action: intensity > 0.6 ? 'dance' : 'move',
        description: this.suggestActionForIntensity(intensity),
        intensity
      });
    }

    // Add emotional expressions at peaks
    for (const peak of audioFeatures.peaks) {
      if (!actions.some(a => Math.abs(a.timestamp - peak) < 100)) {
        actions.push({
          timestamp: peak,
          action: 'emote',
          description: 'Express emotion matching music intensity',
          intensity: this.getIntensityAtTime(peak, audioFeatures.volumeEnvelope, audioFeatures.duration)
        });
      }
    }

    return actions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance for convenience
export const audioAnalysisService = new AudioAnalysisService();