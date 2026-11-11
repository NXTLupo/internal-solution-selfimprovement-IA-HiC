/**
 * Audio Sync Video Generator Component
 *
 * This is a NEW component that adds audio-to-video capabilities.
 * It does NOT modify any existing functionality.
 * This component is completely optional and additive.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Character, Scene, VideoClip } from '../types';
import {
  AudioAnalysisService,
  AudioFeatures,
  SceneBreakpoint,
  TimedAction,
  DialogueMapping,
  audioAnalysisService
} from '../services/audioAnalysisService';
import { Button, SparklesIcon } from './ui';

interface AudioSyncVideoGeneratorProps {
  scenes: Scene[];  // Changed from characters to scenes
  onVideoGenerated?: (videoClip: VideoClip) => void;
  isEnabled?: boolean; // Feature flag for progressive rollout
}

type SyncMode = 'dialogue' | 'music' | 'narrative' | 'auto';

interface AudioVisualizerProps {
  audioFeatures: AudioFeatures | null;
  currentTime: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioFeatures, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioFeatures || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw waveform
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#115054';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const { volumeEnvelope } = audioFeatures;
    const step = canvas.width / volumeEnvelope.length;

    volumeEnvelope.forEach((volume, index) => {
      const x = index * step;
      const y = canvas.height / 2 - (volume * canvas.height / 2);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw beats
    ctx.fillStyle = '#fd8e2e';
    audioFeatures.beatTimings.forEach(beat => {
      const x = (beat / (audioFeatures.duration * 1000)) * canvas.width;
      ctx.fillRect(x - 1, 0, 2, canvas.height);
    });

    // Draw current position
    if (currentTime > 0) {
      ctx.strokeStyle = '#caca20';
      ctx.lineWidth = 3;
      const x = (currentTime / (audioFeatures.duration * 1000)) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }, [audioFeatures, currentTime]);

  return (
    <div className="audio-visualizer">
      <canvas
        ref={canvasRef}
        width={600}
        height={100}
        className="w-full h-24 bg-[#f5f5f5] rounded-lg"
      />
    </div>
  );
};

export const AudioSyncVideoGenerator: React.FC<AudioSyncVideoGeneratorProps> = ({
  scenes,
  onVideoGenerated,
  isEnabled = false
}) => {
  // State management
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>('auto');
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);  // Changed to scenes
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [videoPromptOverride, setVideoPromptOverride] = useState('');
  const [breakpoints, setBreakpoints] = useState<SceneBreakpoint[]>([]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);

  // Feature flag check
  if (!isEnabled) {
    return null; // Don't render if feature is disabled
  }

  const handleAudioUpload = async (file: File | null) => {
    if (!file) return;

    setAudioFile(file);
    setIsAnalyzing(true);
    setProgress(0);

    try {
      // Analyze audio
      const features = await audioAnalysisService.analyzeAudio(file);
      setAudioFeatures(features);

      // Generate scene breakpoints
      const generatedBreakpoints = audioAnalysisService.generateSceneBreakpoints(features);
      setBreakpoints(generatedBreakpoints);

      // Auto-detect sync mode based on audio characteristics
      if (syncMode === 'auto') {
        const hasSpeech = features.segments.some(s => s.hasSpeech);
        const hasStrongBeats = features.beatTimings.length > features.duration * 2; // More than 2 beats per second

        if (hasSpeech) {
          setSyncMode('dialogue');
        } else if (hasStrongBeats) {
          setSyncMode('music');
        } else {
          setSyncMode('narrative');
        }
      }

      // Create audio element for playback
      const url = URL.createObjectURL(file);
      if (audioElementRef.current) {
        audioElementRef.current.src = url;
      }

    } catch (error) {
      console.error('Error analyzing audio:', error);
      alert('Failed to analyze audio file. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSceneToggle = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      if (prev.includes(sceneId)) {
        return prev.filter(id => id !== sceneId);
      }
      return [...prev, sceneId];
    });
  };

  const generateAudioSyncedVideo = async () => {
    if (!audioFile || !audioFeatures || selectedSceneIds.length === 0) {
      alert('Please upload audio and select at least one scene.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Import the gemini service functions
      const { generateAudioSyncVideoFromScene, generateDialogueSyncVideoFromScene, generateMusicSyncVideoFromScene } =
        await import('../services/geminiService');

      const selectedScenes = scenes.filter(s => selectedSceneIds.includes(s.id));

      let videoClip: VideoClip | null = null;

      switch (syncMode) {
        case 'dialogue':
          // Generate dialogue-synced video from scene
          videoClip = await generateDialogueSyncVideoFromScene(
            selectedScenes,
            audioFeatures,
            transcript || videoPromptOverride,
            breakpoints
          );
          break;

        case 'music':
          // Generate music-synced video from scene
          videoClip = await generateMusicSyncVideoFromScene(
            selectedScenes,
            audioFeatures,
            breakpoints,
            videoPromptOverride
          );
          break;

        case 'narrative':
        case 'auto':
        default:
          // Generate general audio-synced video from scene
          videoClip = await generateAudioSyncVideoFromScene(
            selectedScenes,
            audioFeatures,
            breakpoints,
            videoPromptOverride || 'Create a video that matches the audio mood and rhythm'
          );
          break;
      }

      if (videoClip && onVideoGenerated) {
        onVideoGenerated(videoClip);
      }

      setProgress(100);
      alert('Audio-synced video generated successfully!');

    } catch (error) {
      console.error('Error generating audio-synced video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudioPreview = () => {
    if (audioElementRef.current) {
      audioElementRef.current.play();
    }
  };

  const stopAudioPreview = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
  };

  return (
    <div className="audio-sync-video-generator glass-panel">
      <div className="section-header">
        <span className="section-step-badge">🎵</span>
        <h2 className="section-title">Audio-Driven Animation (Gemini Omni)</h2>
        <span className="text-xs bg-[#caca20] text-[#115054] font-bold uppercase px-2 py-1 rounded ml-2 tracking-wider">BETA</span>
      </div>

      <div className="panel-stack">
        {/* Audio Upload Section */}
        <div className="audio-upload-section">
          <label className="form-label">Upload Audio Track</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleAudioUpload(e.target.files?.[0] || null)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="ia-button ia-button--secondary"
          >
            {audioFile ? audioFile.name : 'Choose Audio File'}
          </Button>
        </div>

        {/* Audio Visualizer */}
        {audioFeatures && (
          <div className="audio-visualizer-section">
            <h3 className="text-sm font-medium mb-2 text-[#141414]">Audio Analysis</h3>
            <AudioVisualizer
              audioFeatures={audioFeatures}
              currentTime={currentPlaybackTime}
            />
            <div className="audio-stats grid grid-cols-3 gap-2 mt-2 text-xs">
              <div>Duration: {audioFeatures.duration.toFixed(1)}s</div>
              <div>Beats: {audioFeatures.beatTimings.length}</div>
              <div>Segments: {audioFeatures.segments.length}</div>
            </div>
            <div className="audio-controls mt-2">
              <Button onClick={playAudioPreview} className="ia-button--small">
                ▶ Preview
              </Button>
              <Button onClick={stopAudioPreview} className="ia-button--small ml-2">
                ■ Stop
              </Button>
            </div>
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio
          ref={audioElementRef}
          onTimeUpdate={(e) => setCurrentPlaybackTime(e.currentTarget.currentTime * 1000)}
          className="hidden"
        />

        {/* Sync Mode Selection */}
        {audioFeatures && (
          <div className="sync-mode-section">
            <label className="form-label">Synchronization Mode</label>
            <div className="button-grid">
              {(['auto', 'dialogue', 'music', 'narrative'] as SyncMode[]).map(mode => (
                <Button
                  key={mode}
                  onClick={() => setSyncMode(mode)}
                  className={`ia-button ${syncMode === mode ? 'ia-button--primary' : 'ia-button--secondary'}`}
                >
                  {mode === 'auto' && '🤖 Auto'}
                  {mode === 'dialogue' && '🗣️ Dialogue'}
                  {mode === 'music' && '🎵 Music'}
                  {mode === 'narrative' && '📖 Narrative'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Scene Selection */}
        {audioFeatures && (
          <div className="scene-selection-section">
            <label className="form-label">Select Scenes for Animation</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {scenes.map(scene => (
                <div
                  key={scene.id}
                  onClick={() => handleSceneToggle(scene.id)}
                  className={`gallery-item cursor-pointer ${
                    selectedSceneIds.includes(scene.id) ? 'ring-2 ring-[#115054]' : ''
                  }`}
                  style={{ padding: '4px' }}
                >
                  <img
                    src={scene.imageUrl}
                    alt={scene.description}
                    className="w-full h-24 object-cover rounded"
                  />
                  <span className="text-xs text-center block mt-1">{scene.description.substring(0, 50)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript/Prompt Input */}
        {syncMode === 'dialogue' && (
          <div className="transcript-section">
            <label className="form-label">Dialogue Transcript (optional)</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter the dialogue text that matches the audio..."
              className="ia-input ia-input--textarea"
              rows={3}
            />
          </div>
        )}

        {/* Video Prompt Override */}
        <div className="prompt-override-section">
          <label className="form-label">Video Generation Instructions (optional)</label>
          <textarea
            value={videoPromptOverride}
            onChange={(e) => setVideoPromptOverride(e.target.value)}
            placeholder="Describe how you want the video to look..."
            className="ia-input ia-input--textarea"
            rows={2}
          />
        </div>

        {/* Scene Breakpoints Preview */}
        {breakpoints.length > 0 && (
          <div className="breakpoints-preview">
            <label className="form-label">Detected Scene Breakpoints</label>
            <div className="bg-[#fafafa] p-2 rounded max-h-24 overflow-y-auto">
              {breakpoints.slice(0, 5).map((bp, index) => (
                <div key={index} className="text-xs py-1 border-b border-[#e5e5e5] text-[#525252]">
                  {(bp.timestamp / 1000).toFixed(1)}s - {bp.sceneType} ({bp.suggestedAction})
                </div>
              ))}
              {breakpoints.length > 5 && (
                <div className="text-xs text-[#acacac]">
                  ...and {breakpoints.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateAudioSyncedVideo}
          disabled={!audioFeatures || selectedSceneIds.length === 0 || isGenerating}
          isLoading={isGenerating}
          className="ia-button ia-button--primary ia-button--full"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Generate Audio-Synced Video
        </Button>

        {/* Progress Bar */}
        {(isAnalyzing || isGenerating) && (
          <div className="progress-section">
            <div className="w-full h-2 bg-[#e5e5e5] rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-[#caca20] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[#525252] mt-1">
              {isAnalyzing ? 'Analyzing audio...' : 'Generating video...'}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};