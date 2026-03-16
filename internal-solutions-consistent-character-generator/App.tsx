import React, { useState, useMemo, useEffect } from 'react';
import { Character, Scene, ImageData, VideoClip, VideoGenerationConfig } from './types';
import {
    generateCharacterImage,
    generateObjectImage,
    generateSceneImage,
    generateCharactersFromImage,
    generateObjectsFromImage,
    addCharactersToDB,
    deleteCharacterFromDB,
    loadCharactersFromDB,
    addObjectsToDB,
    deleteObjectFromDB,
    loadObjectsFromDB,
    loadVideoClipsFromDB,
    deleteVideoClipFromDB,
    generateVideoFromScenes,
    generateVideoFromSingleScene,
    pollVideoOperation
} from './services/geminiService';
import { Gallery } from './components/Gallery';
import { CharacterNamingModal } from './components/CharacterNamingModal';
import { Button, PlusIcon, TrashIcon, SparklesIcon, UploadIcon, XIcon } from './components/ui';

// NEW AUDIO-TO-VIDEO COMPONENT (Feature-flagged)
import { AudioSyncVideoGenerator } from './components/AudioSyncVideoGenerator';

import './styles.css';

type GenerationMode = 'character' | 'object';

const getDataUrl = (imageData: ImageData): string => `data:${imageData.mimeType};base64,${imageData.base64}`;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = (reader.result as string).split(',')[1];
      resolve(result);
    };
    reader.onerror = error => reject(error);
  });
};

interface EntityInput {
  id: string;
  description: string;
  file?: File;
  previewUrl?: string;
}

const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [objects, setObjects] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  
  const [generationMode, setGenerationMode] = useState<GenerationMode>('character');
  
  // Video generation state
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [videoDescription, setVideoDescription] = useState<string>('Animate this scene with cinematic movement and natural physics.');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('1080p');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);

  const [entityInputs, setEntityInputs] = useState<EntityInput[]>([
    { id: crypto.randomUUID(), description: 'A kind-faced woman in her 60s with grey hair, smiling warmly, wearing a beige cardigan.' },
    { id: crypto.randomUUID(), description: 'A man in his late 30s with a short beard, wearing a plaid shirt and looking thoughtfully into the distance.' }
  ]);
  const [sceneDescription, setSceneDescription] = useState<string>('enjoying a cup of coffee on a sunny porch.');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [pendingEntities, setPendingEntities] = useState<Character[] | null>(null);
  
  const [isLoadingEntities, setIsLoadingEntities] = useState<boolean>(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [isLoadingScene, setIsLoadingScene] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleLoadData();
  }, []);

  useEffect(() => {
    setSelectedEntityIds([]);
  }, [generationMode]);
  
  const activeEntities = useMemo(() => {
    return generationMode === 'character' ? characters : objects;
  }, [generationMode, characters, objects]);

  const selectedEntities = useMemo(() => {
    return activeEntities.filter(c => selectedEntityIds.includes(c.id));
  }, [activeEntities, selectedEntityIds]);

  const handleLoadData = async () => {
    setError(null);
    setIsLoadingSaved(true);
    try {
      const [loadedCharacters, loadedObjects, loadedVideoClips] = await Promise.all([
        loadCharactersFromDB(), 
        loadObjectsFromDB(),
        loadVideoClipsFromDB()
      ]);
      setCharacters(loadedCharacters);
      setObjects(loadedObjects);
      setVideoClips(loadedVideoClips);
    } catch (e) {
      console.error("Failed to load data from IndexedDB", e);
      setError("Could not load saved data.");
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleInputChange = (id: string, field: 'description' | 'file', value: string | File | undefined) => {
    setEntityInputs(prevInputs =>
      prevInputs.map(input => {
        if (input.id !== id) return input;
        if (field === 'description') {
          return { ...input, description: value as string };
        }
        if (field === 'file') {
          const file = value as File | undefined;
          if (input.previewUrl) {
            URL.revokeObjectURL(input.previewUrl);
          }
          return {
            ...input,
            file: file,
            previewUrl: file ? URL.createObjectURL(file) : undefined,
          };
        }
        return input;
      })
    );
  };

  const addEntityInput = () => {
    setEntityInputs([...entityInputs, { id: crypto.randomUUID(), description: '' }]);
  };

  const removeEntityInput = (id: string) => {
    const inputToRemove = entityInputs.find(input => input.id === id);
    if (inputToRemove?.previewUrl) {
        URL.revokeObjectURL(inputToRemove.previewUrl);
    }
    setEntityInputs(entityInputs.filter((input) => input.id !== id));
  };
  
  const handleClearFile = (id: string) => {
    setEntityInputs(prevInputs =>
        prevInputs.map(input => {
            if (input.id === id && input.previewUrl) {
                URL.revokeObjectURL(input.previewUrl);
                return { ...input, file: undefined, previewUrl: undefined };
            }
            return input;
        })
    );
  };

  const handleEntitySelect = (id: string) => {
    setSelectedEntityIds(prevSelected =>
      prevSelected.includes(id)
        ? prevSelected.filter(entityId => entityId !== id)
        : [...prevSelected, id]
    );
  };

  const handleGenerateEntities = async () => {
    setError(null);
    setIsLoadingEntities(true);
    setSelectedEntityIds([]);
    try {
      const entityPromises = entityInputs
        .filter(input => input.description.trim() !== '' || input.file)
        .map(async (input) => {
            const commonProps = {
                id: crypto.randomUUID(),
                name: '', // Will be set in the modal
            };

            if (input.file) {
                const base64 = await fileToBase64(input.file);
                const imageData = { base64, mimeType: input.file.type };
                const generatedParts = generationMode === 'character'
                    ? await generateCharactersFromImage(imageData, input.description)
                    : await generateObjectsFromImage(imageData, input.description);

                return generatedParts.map(part => ({
                    ...commonProps,
                    id: crypto.randomUUID(), // Ensure each part has a unique ID
                    description: part.description,
                    imageData: part.imageData,
                }));
            } else {
                const imageData = generationMode === 'character'
                    ? await generateCharacterImage(input.description)
                    : await generateObjectImage(input.description);
                return [{ 
                    ...commonProps,
                    description: input.description, 
                    imageData 
                }];
            }
        });
      
      const nestedNewEntities = await Promise.all(entityPromises);
      const newEntities = nestedNewEntities.flat();

      if (newEntities.length > 0) {
        setPendingEntities(newEntities);
      }

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingEntities(false);
    }
  };

  const handleSavePendingEntities = async (namedEntities: Character[]) => {
    try {
      if (generationMode === 'character') {
        await addCharactersToDB(namedEntities);
        setCharacters(prev => [...namedEntities, ...prev]);
      } else {
        await addObjectsToDB(namedEntities);
        setObjects(prev => [...namedEntities, ...prev]);
      }
      setPendingEntities(null);
    } catch(err) {
      console.error("Failed to save new entities", err);
      setError("Could not save the new entities. Please try again.");
    }
  };

  const handleCancelPendingEntities = () => {
    setPendingEntities(null);
  };

  const handleDeleteEntity = async (id: string) => {
    const entityName = generationMode === 'character' ? 'character' : 'object';
    if (window.confirm(`Are you sure you want to delete this ${entityName}? This cannot be undone.`)) {
        try {
            if (generationMode === 'character') {
                await deleteCharacterFromDB(id);
                setCharacters(prev => prev.filter(c => c.id !== id));
            } else {
                await deleteObjectFromDB(id);
                setObjects(prev => prev.filter(o => o.id !== id));
            }
            setSelectedEntityIds(prev => prev.filter(selectedId => selectedId !== id));
        } catch (err) {
            console.error(`Failed to delete ${entityName}:`, err);
            setError(`Failed to delete ${entityName}. Please refresh and try again.`);
        }
    }
  };

  const handleGenerateScene = async () => {
    if (selectedEntities.length === 0 || !sceneDescription.trim()) return;
    
    if (selectedEntities.some(c => !c.imageData)) {
        setError("One or more selected items are missing image data.");
        return;
    }

    setError(null);
    setIsLoadingScene(true);
    try {
      const baseImageData = await generateSceneImage(selectedEntities, sceneDescription, aspectRatio, generationMode);
      
      const newScene: Scene = {
        id: crypto.randomUUID(),
        description: sceneDescription,
        imageUrl: getDataUrl(baseImageData),
        imageData: baseImageData,
        canUseAsVideoFrame: true
      };
      setScenes(prevScenes => [newScene, ...prevScenes]);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingScene(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedSceneId || !videoDescription.trim()) return;
    
    const selectedScene = scenes.find(s => s.id === selectedSceneId);
    
    if (!selectedScene) {
      setError("Could not find selected scene.");
      return;
    }

    if (!selectedScene.imageData) {
      setError("Selected scene is missing image data for video generation.");
      return;
    }

    setError(null);
    setIsGeneratingVideo(true);
    
    try {
      const videoConfig: VideoGenerationConfig = {
        prompt: videoDescription,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        startFrame: selectedScene.imageData
      };

      const newVideoClip = await generateVideoFromSingleScene(
        selectedScene,
        videoDescription,
        videoConfig
      );

      setVideoClips(prevClips => [newVideoClip, ...prevClips]);
      
      // 🎬 CRITICAL DEBUG: Check video data before polling decision
      console.log('🎬 Video clip created - checking for polling trigger:', {
        clipId: newVideoClip.id,
        hasVideoData: !!newVideoClip.videoData,
        videoDataStatus: newVideoClip.videoData?.status,
        hasOperationId: !!newVideoClip.videoData?.operationId,
        operationId: newVideoClip.videoData?.operationId,
        fullVideoData: newVideoClip.videoData
      });
      
      // Start polling for video completion if it's generating
      if (newVideoClip.videoData?.status === 'generating' && newVideoClip.videoData.operationId) {
        console.log('🎬 ✅ POLLING CONDITIONS MET - Starting video polling!');
        startVideoPolling(newVideoClip.id, newVideoClip.videoData.operationId);
      } else {
        console.log('🎬 ❌ POLLING CONDITIONS NOT MET:', {
          statusCheck: newVideoClip.videoData?.status === 'generating',
          operationIdCheck: !!newVideoClip.videoData?.operationId,
          actualStatus: newVideoClip.videoData?.status,
          actualOperationId: newVideoClip.videoData?.operationId
        });
      }
      
    } catch (err: any) {
      setError(err.message || 'Video generation failed.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const startVideoPolling = async (clipId: string, operationId: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals) - extended from 5 minutes
    let attempts = 0;
    const startTime = Date.now();
    
    console.log(`🎬 Starting video polling for clip ${clipId} with operation ${operationId}`);
    console.log(`⏰ Max attempts: ${maxAttempts} (${(maxAttempts * 5) / 60} minutes)`);
    
    const pollInterval = setInterval(async () => {
      attempts++;
      const elapsedMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      
      console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} (${elapsedMinutes} min elapsed)`);
      
      try {
        const videoData = await pollVideoOperation(operationId);
        
        if (videoData.status === 'completed' || videoData.status === 'failed') {
          clearInterval(pollInterval);
          const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          
          if (videoData.status === 'completed') {
            console.log(`🎉 Video generation completed in ${totalTime} minutes!`);
          } else {
            console.log(`❌ Video generation failed after ${totalTime} minutes`);
          }
          
          // Update the video clip in state
          setVideoClips(prevClips =>
            prevClips.map(clip =>
              clip.id === clipId
                ? { ...clip, videoData }
                : clip
            )
          );
        }
      } catch (error) {
        console.error(`❌ Video polling error (attempt ${attempts}):`, error);
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
          console.log(`⏰ Video polling timeout after ${totalTime} minutes (${attempts} attempts)`);
          
          setVideoClips(prevClips =>
            prevClips.map(clip =>
              clip.id === clipId
                ? { ...clip, videoData: { ...clip.videoData!, status: 'failed' } }
                : clip
            )
          );
        }
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.log(`⏰ Reached maximum polling attempts (${maxAttempts}) - stopping poll`);
      }
    }, 5000); // Poll every 5 seconds
  };

  const modeText = generationMode === 'character' ? 'Character' : 'Object';
  const pluralModeText = generationMode === 'character' ? 'Characters' : 'Objects';
  
  let entityEmptyMessage = `No ${pluralModeText.toLowerCase()} found. Generate some new ones!`;
  if (isLoadingSaved) {
    entityEmptyMessage = `Loading saved ${pluralModeText.toLowerCase()}...`;
  } else if (isLoadingEntities) {
    entityEmptyMessage = `Generating ${pluralModeText.toLowerCase()}...`;
  }
  
  return (
    <>
      {pendingEntities && (
          <CharacterNamingModal 
            characters={pendingEntities}
            onSave={handleSavePendingEntities}
            onCancel={handleCancelPendingEntities}
            generationMode={generationMode}
          />
      )}
      <div className="ia-app-shell">
        <header className="intelligence-augmentation-header">
          <div className="ia-container">
            <div className="ia-content">
              <div className="ia-text-section">
                <span className="ia-introducing">Intelligence Augmentation Suite · Content Generation</span>
                <div className="ia-main-text">
                  <span className="ia-intelligence">Consistent</span>
                  <span className="ia-augmentation">Persona Generator</span>
                </div>
                <p className="ia-description">
                  Craft persistent personas, choreograph objects, and render cinematic scenes that stay on-model across every deliverable.
                </p>
              </div>
              <div className="ia-badges">
                <span className="badge">Content Generation Toolkit</span>
                <span className="badge badge-secondary">Extended Consistency Engine</span>
              </div>
            </div>
          </div>
        </header>

        <main className="ia-main">
          <div className="ia-main-container">
            {error && (
              <div className="ia-error" role="alert">
                <strong>Error:</strong> <span>{error}</span>
              </div>
            )}

            <div className="ia-grid">
              <div className="column-stack">
                <section className="glass-panel">
                  <div className="section-header">
                    <div className="section-title-group">
                      <span className="section-step-badge">1</span>
                      <div>
                        <h2 className="section-title">Define {pluralModeText}</h2>
                        <p className="section-subtitle">
                          Describe appearances or upload references to build a reusable library.
                        </p>
                      </div>
                    </div>
                    <div className="mode-toggle">
                      {(['character', 'object'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setGenerationMode(mode)}
                          className={generationMode === mode ? 'active' : ''}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="entity-input-stack">
                    {entityInputs.map((input, index) => (
                      <div key={input.id} className="entity-input">
                        <div className="entity-input-row">
                          <input
                            type="text"
                            value={input.description}
                            onChange={(e) => handleInputChange(input.id, 'description', e.target.value)}
                            placeholder={`${modeText} ${index + 1}: Describe or upload image`}
                            className="ia-input"
                            aria-label={`${modeText} ${index + 1} description`}
                          />
                          <label
                            htmlFor={`file-upload-${input.id}`}
                            className="icon-button"
                            title="Upload an image"
                          >
                            <UploadIcon className="w-5 h-5" />
                            <input
                              id={`file-upload-${input.id}`}
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={(e) => handleInputChange(input.id, 'file', e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeEntityInput(input.id)}
                            className="icon-button danger"
                            aria-label={`Remove ${modeText.toLowerCase()} ${index + 1}`}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        {input.previewUrl && input.file && (
                          <div className="file-pill">
                            <img src={input.previewUrl} alt="Preview" />
                            <span className="file-name">{input.file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleClearFile(input.id)}
                              className="file-remove"
                              aria-label="Clear uploaded file"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="action-row">
                    <Button onClick={addEntityInput} className="ia-button--ghost">
                      <PlusIcon className="w-5 h-5" />
                      Add {modeText}
                    </Button>
                    <Button
                      onClick={handleGenerateEntities}
                      isLoading={isLoadingEntities}
                      disabled={entityInputs.every(d => d.description.trim() === '' && !d.file)}
                    >
                      <SparklesIcon className="w-5 h-5" />
                      Generate New
                    </Button>
                  </div>
                </section>

                <section className={`glass-panel scene-panel ${selectedEntities.length === 0 ? 'is-disabled' : ''}`}>
                  <div className="section-header">
                    <div className="section-title-group">
                      <span className="section-step-badge">2</span>
                      <div>
                        <h2 className="section-title">Create Scenes</h2>
                        <p className="section-subtitle">
                          Blend selected {pluralModeText.toLowerCase()} into cinematic compositions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedEntities.length === 0 ? (
                    <div className="gallery-empty">
                      Select one or more {pluralModeText.toLowerCase()} to start creating scenes.
                    </div>
                  ) : (
                    <div className="panel-stack">
                      <div>
                        <label htmlFor="scene" className="form-label">
                          Scene Description
                        </label>
                        <textarea
                          id="scene"
                          rows={3}
                          value={sceneDescription}
                          onChange={(e) => setSceneDescription(e.target.value)}
                          placeholder="e.g., exploring a mystical forest at night"
                          className="ia-textarea"
                        />
                      </div>

                      <div>
                        <span className="form-label">Aspect Ratio</span>
                        <div className="toggle-group">
                          {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setAspectRatio(ratio)}
                              className={`toggle-button ${aspectRatio === ratio ? 'is-active' : ''}`}
                            >
                              {ratio === '1:1' && 'Square'}
                              {ratio === '16:9' && 'Landscape'}
                              {ratio === '9:16' && 'Portrait'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={handleGenerateScene}
                        isLoading={isLoadingScene}
                        disabled={!sceneDescription.trim() || selectedEntities.length === 0}
                        className="ia-button--full"
                      >
                        <SparklesIcon className="w-5 h-5" />
                        Generate Scene
                      </Button>
                    </div>
                  )}
                </section>

                {scenes.length >= 1 && (
                  <section className="glass-panel">
                    <div className="section-header">
                      <div className="section-title-group">
                        <span className="section-step-badge">🎬</span>
                        <h2 className="section-title">Generate Video Clips</h2>
                      </div>
                    </div>

                    <div className="panel-stack">
                      <div>
                        <label className="form-label">Select Scene to Animate</label>
                        <select
                          value={selectedSceneId || ''}
                          onChange={(e) => setSelectedSceneId(e.target.value || null)}
                          className="ia-select"
                        >
                          <option value="">Choose a scene to bring to life</option>
                          {scenes.filter(s => s.canUseAsVideoFrame).map(scene => (
                            <option key={scene.id} value={scene.id}>
                              {scene.description.length > 50 ? `${scene.description.slice(0, 50)}...` : scene.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Video Direction</label>
                        <textarea
                          rows={2}
                          value={videoDescription}
                          onChange={(e) => setVideoDescription(e.target.value)}
                          placeholder="e.g., Add gentle wind movement to the trees and a slow cinematic pan across the scene."
                          className="ia-textarea"
                        />
                      </div>

                      <div className="toggle-group">
                        {(['16:9', '9:16'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setVideoAspectRatio(ratio)}
                            className={`toggle-button ${videoAspectRatio === ratio ? 'is-active' : ''}`}
                          >
                            {ratio === '16:9' ? 'Landscape' : 'Portrait'}
                          </button>
                        ))}
                      </div>

                      <div className="toggle-group">
                        {(['720p', '1080p'] as const).map((res) => (
                          <button
                            key={res}
                            type="button"
                            onClick={() => setVideoResolution(res)}
                            className={`toggle-button ${videoResolution === res ? 'is-active' : ''}`}
                          >
                            {res}
                          </button>
                        ))}
                      </div>

                      <Button
                        onClick={handleGenerateVideo}
                        isLoading={isGeneratingVideo}
                        disabled={!selectedSceneId || !videoDescription.trim()}
                        className="ia-button--full"
                      >
                        Generate Video Clip (8 seconds)
                      </Button>
                    </div>
                  </section>
                )}
              </div>

              <div className="column-stack">
                <Gallery
                  title={pluralModeText}
                  items={activeEntities.map(c => ({
                    id: c.id,
                    imageUrl: c.imageData ? getDataUrl(c.imageData) : '',
                    title: c.name
                  }))}
                  selectedIds={selectedEntityIds}
                  onItemSelect={handleEntitySelect}
                  onItemDelete={handleDeleteEntity}
                  emptyStateMessage={entityEmptyMessage}
                />

                <Gallery
                  title="Generated Scenes"
                  items={scenes.map(s => ({
                    id: s.id,
                    imageUrl: s.imageUrl,
                    title: s.description
                  }))}
                  isDownloadable={true}
                  hideTitle={true}
                  emptyStateMessage="Your generated scenes will appear here."
                />

                {videoClips.length > 0 && (
                  <section className="glass-panel">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="section-title">Generated Video Clips</h2>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const failedOrGenerating = videoClips.filter(clip =>
                              clip.videoData?.status === 'generating' ||
                              clip.videoData?.status === 'failed'
                            );
                            if (failedOrGenerating.length > 0) {
                              if (confirm(`Clear ${failedOrGenerating.length} stuck/failed video(s)?`)) {
                                Promise.all(failedOrGenerating.map(clip => deleteVideoClipFromDB(clip.id)))
                                  .then(() => {
                                    setVideoClips(prev => prev.filter(c =>
                                      c.videoData?.status === 'completed'
                                    ));
                                  });
                              }
                            } else {
                              alert('No stuck or failed videos to clear');
                            }
                          }}
                          className="ia-button ia-button--subtle"
                        >
                          Clear Failed
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm(`Clear all ${videoClips.length} video clip(s)? This cannot be undone.`)) {
                              Promise.all(videoClips.map(clip => deleteVideoClipFromDB(clip.id)))
                                .then(() => {
                                  setVideoClips([]);
                                });
                            }
                          }}
                          className="ia-button--danger"
                        >
                          Clear All Videos
                        </Button>
                      </div>
                    </div>
                    <div className="column-stack">
                      {videoClips.map((clip) => (
                        <div key={clip.id} className="video-card">
                          <div>
                            <h3>{clip.description}</h3>
                            <div className="video-meta">
                              {clip.aspectRatio} • {clip.resolution} • {new Date(clip.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {clip.videoData?.status === 'generating' && (
                            <div className="video-status">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                <span>Generating video...</span>
                                <span className="text-xs opacity-60">
                                  (Started {new Date(clip.createdAt).toLocaleTimeString()})
                                </span>
                              </div>
                              {/* Show warning if it's been stuck for more than 5 minutes */}
                              {(new Date().getTime() - new Date(clip.createdAt).getTime()) > 300000 && (
                                <div className="text-yellow-500 text-sm mt-2">
                                  ⚠️ This video seems stuck. Consider clearing it.
                                </div>
                              )}
                            </div>
                          )}

                          {clip.videoData?.status === 'failed' && (
                            <div className="video-status text-red-500">
                              <div className="flex items-center gap-2">
                                <span>❌</span>
                                <span>Video generation failed</span>
                              </div>
                              {clip.videoData?.error && (
                                <div className="text-sm mt-2 p-2 bg-red-50 text-red-700 rounded">
                                  {clip.videoData.error.includes('Safety Filter') ? (
                                    <>
                                      <strong>⚠️ Content Safety Issue:</strong>
                                      <p className="mt-1">The audio or prompt was blocked by Veo 3's safety filters.</p>
                                      <p className="text-xs mt-1">Try using different audio or modifying your prompt.</p>
                                    </>
                                  ) : (
                                    clip.videoData.error
                                  )}
                                </div>
                              )}
                              <div className="text-xs opacity-60 mt-1">
                                Try generating again or clear this entry
                              </div>
                            </div>
                          )}

                          {clip.videoData?.status === 'completed' && clip.videoData.url && (
                            <>
                              <video controls className="video-frame" preload="metadata">
                                <source src={clip.videoData.url} type={clip.videoData.mimeType} />
                                Your browser does not support the video tag.
                              </video>

                              <div className="action-row">
                                <a
                                  href={clip.videoData.url}
                                  download={`video-${clip.id.slice(0, 8)}.mp4`}
                                  className="ia-button ia-button--subtle"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Download Video
                                </a>
                                <Button
                                  onClick={() =>
                                    deleteVideoClipFromDB(clip.id).then(() =>
                                      setVideoClips(prev => prev.filter(c => c.id !== clip.id))
                                    )
                                  }
                                  className="ia-button--danger"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Delete
                                </Button>
                              </div>
                            </>
                          )}

                          {clip.videoData?.status === 'failed' && (
                            <div className="ia-error">Video generation failed. Please try again.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* NEW AUDIO-TO-VIDEO SECTION - Feature Flagged for Progressive Rollout */}
                {/* To enable: Set ENABLE_AUDIO_SYNC to true */}
                {(() => {
                  const ENABLE_AUDIO_SYNC = true; // ENABLED: Audio-to-Video features are now active!
                  if (ENABLE_AUDIO_SYNC && scenes.length > 0) {
                    return (
                      <AudioSyncVideoGenerator
                        scenes={scenes}
                        onVideoGenerated={(newClip) => {
                          setVideoClips(prev => [newClip, ...prev]);
                          // Start polling if needed
                          if (newClip.videoData?.status === 'generating' && newClip.videoData.operationId) {
                            startVideoPolling(newClip.id, newClip.videoData.operationId);
                          }
                        }}
                        isEnabled={true}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default App;
