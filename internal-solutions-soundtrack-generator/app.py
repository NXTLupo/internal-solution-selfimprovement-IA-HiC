#!/usr/bin/env python3
"""
AI Soundtrack Generator
======================

Advanced AI-powered soundtrack generation service using ElevenLabs API for:
- Text-to-speech dialogue generation
- Sound effects creation
- Background music synthesis
- Automatic video soundtrack generation

Features:
- Composite soundtrack creation from text input
- Automatic video analysis and soundtrack generation
- Multi-layered audio mixing (dialogue, effects, music)
- Real-time processing with progress tracking
- Download ready audio files
"""

import os
import asyncio
import json
import tempfile
import uuid
import random
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging

import numpy as np
from PIL import Image
from pydub import AudioSegment
from moviepy.editor import VideoFileClip
import requests

from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

import elevenlabs
from elevenlabs import play, save, Voice, VoiceSettings
import openai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AI Soundtrack Generator", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize AI clients
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not ELEVENLABS_API_KEY:
    logger.error("ELEVENLABS_API_KEY not found in environment variables")
    raise ValueError("ElevenLabs API key is required")

if not OPENAI_API_KEY:
    logger.error("OPENAI_API_KEY not found in environment variables")
    raise ValueError("OpenAI API key is required")

# Initialize clients
elevenlabs_client = elevenlabs.ElevenLabs(api_key=ELEVENLABS_API_KEY)
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Global storage for processing jobs
processing_jobs = {}

class SoundtrackGenerator:
    """Main class for AI soundtrack generation"""
    
    def __init__(self):
        self.elevenlabs = elevenlabs_client
        self.openai = openai_client
        
    def _get_elevenlabs_optimal_influence(self, content_type: str) -> float:
        """Get ElevenLabs recommended prompt_influence values for maximum variety
        
        Based on ElevenLabs' official video-to-sfx example which uses 0.3 consistently.
        Lower values (0.2-0.3) provide more creative variety while maintaining quality.
        
        Args:
            content_type: 'effects' or 'music'
        
        Returns:
            float: prompt_influence value optimized for variety
        """
        # ElevenLabs uses 0.3 in their official example for maximum variety
        # We'll use slightly different values for effects vs music
        optimal_values = {
            'effects': 0.25,  # Slightly lower for more creative sound effects  
            'music': 0.2      # Even lower for more musical variety
        }
        
        influence = optimal_values.get(content_type, 0.3)
        logger.info(f"Using ElevenLabs optimal prompt_influence for {content_type}: {influence}")
        return influence
        
    def _enhance_prompt_for_variety(self, prompt: str, content_type: str) -> str:
        """Enhance prompts with variety-inducing keywords based on ElevenLabs best practices
        
        Args:
            prompt: Original prompt text
            content_type: 'effects' or 'music'
            
        Returns:
            str: Enhanced prompt with variety keywords
        """
        variety_enhancers = {
            'effects': [
                'dynamic', 'layered', 'textured', 'atmospheric', 'immersive',
                'detailed', 'rich', 'varied', 'complex', 'nuanced'
            ],
            'music': [
                'expressive', 'flowing', 'organic', 'melodic', 'harmonic',
                'rhythmic', 'soulful', 'evocative', 'artistic', 'creative'
            ]
        }
        
        # Randomly select 1-2 enhancers to add variety without overwhelming the prompt
        enhancers = variety_enhancers.get(content_type, [])
        selected_enhancers = random.sample(enhancers, min(2, len(enhancers)))
        
        # Add enhancers to the beginning of the prompt for emphasis
        enhanced_prompt = f"{', '.join(selected_enhancers)} {prompt}"
        
        logger.info(f"Enhanced {content_type} prompt with variety keywords: {selected_enhancers}")
        return enhanced_prompt
        
    async def generate_custom_soundtrack(self,
                                        dialogue_text: str,
                                        voice_id: str = "default",
                                        voice_speed: float = 1.0,
                                        voice_stability: float = 0.5,
                                        effects_description: str = "",
                                        effects_duration: int = 8,
                                        effects_prompt_influence: float = 0.3,
                                        music_description: str = "",
                                        music_duration: int = 15,
                                        music_prompt_influence: float = 0.2,
                                        mood: str = "neutral",
                                        output_quality: str = "mp3_22050_32",
                                        dialogue_level: int = 0,
                                        effects_level: int = -8,
                                        music_level: int = -12) -> str:
        """Generate soundtrack from separate component descriptions"""
        
        job_id = str(uuid.uuid4())
        processing_jobs[job_id] = {"status": "processing", "progress": 0}
        
        try:
            # Step 1: Generate TTS dialogue (25%) - only if dialogue text provided
            dialogue_audio = None
            if dialogue_text and dialogue_text.strip():
                processing_jobs[job_id]["progress"] = 10
                processing_jobs[job_id]["status"] = "Generating dialogue..."
                dialogue_audio = await self._generate_dialogue(dialogue_text, voice_id, voice_speed, voice_stability)
            processing_jobs[job_id]["progress"] = 25
            
            # Step 2: Generate custom sound effects (50%)
            effects_audio = None
            if effects_description.strip():
                processing_jobs[job_id]["status"] = "Creating custom sound effects..."
                effects_audio = await self._generate_custom_sound_effects(effects_description, effects_duration, mood, effects_prompt_influence, output_quality)
            elif dialogue_text and dialogue_text.strip():
                # Fallback: Generate AI-analyzed sound effects from dialogue content
                processing_jobs[job_id]["status"] = "Creating AI-analyzed sound effects..."
                effects_audio = await self._generate_sound_effects(dialogue_text, mood)
            # If no effects description and no dialogue, skip effects generation
            processing_jobs[job_id]["progress"] = 50
            
            # Step 3: Generate custom background music (75%)
            music_audio = None
            if music_description.strip():
                processing_jobs[job_id]["status"] = "Composing custom background music..."
                music_audio = await self._generate_custom_background_music(music_description, music_duration, mood, music_prompt_influence, output_quality)
            elif dialogue_text and dialogue_text.strip():
                # Fallback: Generate AI-analyzed background music from dialogue content and mood
                processing_jobs[job_id]["status"] = "Composing AI-analyzed background music..."
                music_audio = await self._generate_background_music(mood, dialogue_text)
            # If no music description and no dialogue, skip music generation
            processing_jobs[job_id]["progress"] = 75
            
            # Step 4: Mix all audio layers (100%)
            processing_jobs[job_id]["status"] = "Mixing final soundtrack..."
            final_audio_path = await self._mix_audio_layers(
                dialogue=dialogue_audio,
                effects=effects_audio,
                music=music_audio,
                job_id=job_id,
                dialogue_level=dialogue_level,
                effects_level=effects_level,
                music_level=music_level
            )
            processing_jobs[job_id]["progress"] = 100
            processing_jobs[job_id]["status"] = "completed"
            processing_jobs[job_id]["file_path"] = final_audio_path
            
            return job_id
            
        except Exception as e:
            logger.error(f"Error generating custom soundtrack: {e}")
            processing_jobs[job_id]["status"] = "error"
            processing_jobs[job_id]["error"] = str(e)
            raise

    async def generate_text_soundtrack(self, 
                                     text_content: str,
                                     voice_id: str = "default",
                                     include_effects: bool = True,
                                     include_music: bool = True,
                                     mood: str = "neutral") -> str:
        """Generate soundtrack from text input (legacy method for backwards compatibility)"""
        
        job_id = str(uuid.uuid4())
        processing_jobs[job_id] = {"status": "processing", "progress": 0}
        
        try:
            # Step 1: Generate TTS dialogue (30%)
            processing_jobs[job_id]["progress"] = 10
            processing_jobs[job_id]["status"] = "Generating dialogue..."
            
            dialogue_audio = await self._generate_dialogue(text_content, voice_id)
            processing_jobs[job_id]["progress"] = 30
            
            # Step 2: Analyze content for effects (60%)
            if include_effects:
                processing_jobs[job_id]["status"] = "Creating sound effects..."
                effects_audio = await self._generate_sound_effects(text_content, mood)
                processing_jobs[job_id]["progress"] = 60
            else:
                effects_audio = None
                
            # Step 3: Generate background music (80%)
            if include_music:
                processing_jobs[job_id]["status"] = "Composing background music..."
                music_audio = await self._generate_background_music(mood, text_content)
                processing_jobs[job_id]["progress"] = 80
            else:
                music_audio = None
                
            # Step 4: Mix all audio layers (100%)
            processing_jobs[job_id]["status"] = "Mixing final soundtrack..."
            final_audio_path = await self._mix_audio_layers(
                dialogue=dialogue_audio,
                effects=effects_audio,
                music=music_audio,
                job_id=job_id
            )
            processing_jobs[job_id]["progress"] = 100
            processing_jobs[job_id]["status"] = "completed"
            processing_jobs[job_id]["file_path"] = final_audio_path
            
            return job_id
            
        except Exception as e:
            logger.error(f"Error generating text soundtrack: {e}")
            processing_jobs[job_id]["status"] = "error"
            processing_jobs[job_id]["error"] = str(e)
            raise
    
    # VIDEO FUNCTIONALITY DISABLED - USER FEEDBACK: "IT STINKS"
    # async def generate_video_soundtrack(self, video_path: str) -> str:
    #     """Generate professional soundtrack for uploaded video using advanced multi-stage analysis"""
        
        job_id = str(uuid.uuid4())
        processing_jobs[job_id] = {"status": "processing", "progress": 0}
        
        try:
            # Step 1: Extract video metadata and audio (10%)
            processing_jobs[job_id]["status"] = "Analyzing video properties..."
            video_metadata = await self._extract_video_metadata(video_path)
            processing_jobs[job_id]["progress"] = 10
            
            # Step 2: Extract strategic frames for analysis (20%)
            processing_jobs[job_id]["status"] = "Extracting key video moments..."
            frames_data = await self._extract_strategic_frames(video_path, video_metadata)
            processing_jobs[job_id]["progress"] = 20
            
            # Step 3: Advanced multi-frame scene analysis (35%)
            processing_jobs[job_id]["status"] = "AI analyzing video narrative..."
            scene_analysis = await self._analyze_video_narrative(frames_data, video_metadata)
            processing_jobs[job_id]["progress"] = 35
            
            # Step 4: Generate scene-specific sound effects (50%)
            processing_jobs[job_id]["status"] = "Creating contextual sound effects..."
            effects_segments = await self._generate_scene_specific_effects(scene_analysis, video_metadata)
            processing_jobs[job_id]["progress"] = 50
            
            # Step 5: Generate adaptive background music (65%)
            processing_jobs[job_id]["status"] = "Composing adaptive music score..."
            music_segments = await self._generate_dynamic_music_score(scene_analysis, video_metadata)
            processing_jobs[job_id]["progress"] = 65
            
            # Step 6: Create atmospheric layers (80%)
            processing_jobs[job_id]["status"] = "Adding atmospheric layers..."
            ambient_audio = await self._generate_atmospheric_layers(scene_analysis, video_metadata)
            processing_jobs[job_id]["progress"] = 80
            
            # Step 7: Advanced synchronization and mixing (95%)
            processing_jobs[job_id]["status"] = "Synchronizing and mixing final soundtrack..."
            final_audio_path = await self._create_synchronized_soundtrack(
                video_path=video_path,
                effects_segments=effects_segments,
                music_segments=music_segments,
                ambient_audio=ambient_audio,
                scene_analysis=scene_analysis,
                video_metadata=video_metadata,
                job_id=job_id
            )
            processing_jobs[job_id]["progress"] = 100
            processing_jobs[job_id]["status"] = "completed"
            processing_jobs[job_id]["file_path"] = final_audio_path
            
            return job_id
            
        except Exception as e:
            logger.error(f"Error generating video soundtrack: {e}")
            processing_jobs[job_id]["status"] = "error"
            processing_jobs[job_id]["error"] = str(e)
            raise
    
    async def _generate_dialogue(self, text: str, voice_id: str, speed: float = 1.0, stability: float = 0.5) -> AudioSegment:
        """Generate TTS dialogue using ElevenLabs"""
        try:
            # Use ElevenLabs text-to-speech with correct API
            selected_voice = voice_id if voice_id != "default" else "EXAVITQu4vr4xnSDxMaL"
            
            # Updated for newer ElevenLabs API with voice settings
            from elevenlabs import VoiceSettings
            
            voice_settings = VoiceSettings(
                stability=stability,
                similarity_boost=0.75,  # Standard similarity boost
                style=0.5,              # Neutral style
                use_speaker_boost=True   # Enable speaker boost for clarity
            )
            
            result = self.elevenlabs.text_to_speech.convert(
                voice_id=selected_voice,
                text=text,
                model_id="eleven_multilingual_v2",
                voice_settings=voice_settings,
                output_format="mp3_22050_32"
            )
            
            # Save temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            for chunk in result:
                if chunk:
                    temp_file.write(chunk)
            temp_file.close()
            
            # Load as AudioSegment
            audio = AudioSegment.from_mp3(temp_file.name)
            os.unlink(temp_file.name)  # Clean up temp file
            
            return audio
            
        except Exception as e:
            logger.error(f"Error generating dialogue: {e}")
            raise
    
    async def _generate_custom_sound_effects(self, effects_description: str, duration: int, mood: str = "neutral", prompt_influence: float = 0.3, output_format: str = "mp3_22050_32") -> AudioSegment:
        """Generate custom sound effects with ElevenLabs optimal settings for maximum variety"""
        try:
            # Use user's description and enhance with variety keywords
            base_prompt = effects_description.strip()
            
            # Enhance prompt for better variety (ElevenLabs best practice)
            enhanced_prompt = self._enhance_prompt_for_variety(base_prompt, 'effects')
            
            # Trim prompt to fit ElevenLabs 450 character limit
            trimmed_prompt = enhanced_prompt[:450] if len(enhanced_prompt) > 450 else enhanced_prompt
            
            # Use user-specified prompt_influence (allows manual control)
            
            logger.info(f"Generating custom sound effects with enhanced prompt ({len(trimmed_prompt)} chars): {trimmed_prompt}")
            logger.info(f"Using ElevenLabs optimal prompt_influence: {prompt_influence} for maximum variety")
            
            # Direct HTTP call to ElevenLabs Sound Generation API
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            data = {
                "text": trimmed_prompt,
                "duration_seconds": float(duration),
                "prompt_influence": prompt_influence,
                "output_format": output_format
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated custom sound effects audio: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Custom Sound Effects API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating custom sound effects: {e}")
            return AudioSegment.silent(duration=1000)

    async def _generate_custom_background_music(self, music_description: str, duration: int, mood: str = "neutral", prompt_influence: float = 0.2, output_format: str = "mp3_22050_32") -> AudioSegment:
        """Generate custom background music with ElevenLabs optimal settings for maximum variety"""
        try:
            # Use user's description and enhance with variety keywords
            base_prompt = music_description.strip()
            
            # Enhance prompt for better musical variety (ElevenLabs best practice)
            enhanced_prompt = self._enhance_prompt_for_variety(base_prompt, 'music')
            
            # Use user-specified prompt_influence for music (allows manual control)
            
            logger.info(f"Generating custom background music with enhanced prompt: {enhanced_prompt}")
            logger.info(f"Using ElevenLabs optimal prompt_influence: {prompt_influence} for maximum musical variety")
            
            # Direct HTTP call to ElevenLabs Sound Generation API for music
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            data = {
                "text": enhanced_prompt,
                "duration_seconds": float(duration),
                "prompt_influence": prompt_influence,
                "output_format": output_format
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated custom background music: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Custom Music API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating custom background music: {e}")
            return AudioSegment.silent(duration=1000)

    async def _generate_sound_effects(self, text: str, mood: str) -> AudioSegment:
        """Generate sound effects based on text content using ElevenLabs Sound Effects API via HTTP"""
        try:
            # Analyze text to determine appropriate sound effects
            effects_prompt = await self._create_effects_prompt(text, mood)
            
            # Generate ACTUAL sound effects using direct HTTP call to ElevenLabs Sound Effects API
            # Trim prompt to fit ElevenLabs 450 character limit
            trimmed_prompt = effects_prompt[:450] if len(effects_prompt) > 450 else effects_prompt
            logger.info(f"Generating sound effects with prompt ({len(trimmed_prompt)} chars): {trimmed_prompt}")
            
            # Direct HTTP call to ElevenLabs Sound Generation API
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            # Enhance prompt for variety and use optimal influence
            enhanced_prompt = self._enhance_prompt_for_variety(trimmed_prompt, 'effects')
            final_prompt = enhanced_prompt[:450] if len(enhanced_prompt) > 450 else enhanced_prompt
            prompt_influence = self._get_elevenlabs_optimal_influence('effects')
            
            logger.info(f"Legacy sound effects using enhanced prompt: {final_prompt}")
            logger.info(f"Using ElevenLabs optimal prompt_influence: {prompt_influence}")
            
            data = {
                "text": final_prompt,
                "duration_seconds": 8.0,
                "prompt_influence": prompt_influence
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated sound effects audio: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Sound Effects API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating sound effects: {e}")
            return AudioSegment.silent(duration=1000)
    
    async def _generate_background_music(self, mood: str, content: str) -> AudioSegment:
        """Generate background music using ElevenLabs Sound Effects API via HTTP with musical prompts"""
        try:
            # Create music prompt based on mood and content - be specific for sound generation
            music_prompt = f"Soft ambient {mood} instrumental background music, gentle melody, atmospheric"
            
            logger.info(f"Generating background music with prompt: {music_prompt}")
            
            # Direct HTTP call to ElevenLabs Sound Generation API for music
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            # Enhance prompt for variety and use optimal influence
            enhanced_prompt = self._enhance_prompt_for_variety(music_prompt, 'music')
            prompt_influence = self._get_elevenlabs_optimal_influence('music')
            
            logger.info(f"Legacy background music using enhanced prompt: {enhanced_prompt}")
            logger.info(f"Using ElevenLabs optimal prompt_influence: {prompt_influence}")
            
            data = {
                "text": enhanced_prompt,
                "duration_seconds": 12.0,
                "prompt_influence": prompt_influence
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated background music: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Music API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating background music: {e}")
            return AudioSegment.silent(duration=1000)
    
    async def _extract_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Extract comprehensive video metadata for analysis"""
        try:
            clip = VideoFileClip(video_path)
            
            metadata = {
                "duration": clip.duration,
                "fps": clip.fps,
                "width": clip.w,
                "height": clip.h,
                "aspect_ratio": clip.w / clip.h if clip.h > 0 else 1.0,
                "total_frames": int(clip.duration * clip.fps) if clip.fps else 0,
                "has_audio": clip.audio is not None,
                "filename": os.path.basename(video_path)
            }
            
            # Analyze video properties for better audio generation
            if metadata["duration"] < 10:
                metadata["video_type"] = "short_clip"
            elif metadata["duration"] < 60:
                metadata["video_type"] = "medium_video"
            elif metadata["duration"] < 300:
                metadata["video_type"] = "long_video"
            else:
                metadata["video_type"] = "feature_length"
            
            # Determine video style based on resolution and aspect ratio
            if metadata["width"] >= 1920:
                metadata["quality"] = "high_definition"
            elif metadata["width"] >= 1280:
                metadata["quality"] = "hd"
            else:
                metadata["quality"] = "standard"
                
            # Aspect ratio analysis for content type hints
            if abs(metadata["aspect_ratio"] - 16/9) < 0.1:
                metadata["format_hint"] = "widescreen"
            elif abs(metadata["aspect_ratio"] - 4/3) < 0.1:
                metadata["format_hint"] = "traditional"
            elif abs(metadata["aspect_ratio"] - 9/16) < 0.1:
                metadata["format_hint"] = "vertical_mobile"
            elif metadata["aspect_ratio"] > 2.0:
                metadata["format_hint"] = "cinematic"
            else:
                metadata["format_hint"] = "square_social"
            
            clip.close()
            logger.info(f"Video metadata extracted: {metadata}")
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting video metadata: {e}")
            raise
    
    async def _extract_strategic_frames(self, video_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Extract frames strategically based on video length and type"""
        try:
            clip = VideoFileClip(video_path)
            duration = metadata["duration"]
            
            # Dynamic frame extraction based on video length
            if duration < 30:
                # Short videos: 4 frames + key moments
                frame_times = [
                    duration * 0.05,   # Opening
                    duration * 0.35,   # Early middle
                    duration * 0.65,   # Late middle  
                    duration * 0.95    # Ending
                ]
            elif duration < 120:
                # Medium videos: 8 frames for better analysis
                frame_times = [
                    duration * 0.05,   # Opening
                    duration * 0.15,   # Early
                    duration * 0.3,    # Early middle
                    duration * 0.45,   # Middle
                    duration * 0.55,   # Late middle
                    duration * 0.7,    # Late
                    duration * 0.85,   # Near end
                    duration * 0.95    # Ending
                ]
            else:
                # Long videos: 12 frames for comprehensive analysis
                frame_times = [
                    duration * 0.02,   # Very start
                    duration * 0.08,   # Opening
                    duration * 0.15,   # Early
                    duration * 0.25,   # First quarter
                    duration * 0.35,   # Early middle
                    duration * 0.45,   # True middle
                    duration * 0.55,   # Late middle
                    duration * 0.65,   # Third quarter
                    duration * 0.75,   # Late
                    duration * 0.85,   # Near end
                    duration * 0.92,   # Ending approach
                    duration * 0.98    # Final moment
                ]
            
            frames_data = {
                "frame_paths": [],
                "frame_timestamps": frame_times,
                "frame_count": len(frame_times),
                "sampling_strategy": "strategic_temporal"
            }
            
            for i, time_point in enumerate(frame_times):
                try:
                    frame = clip.get_frame(time_point)
                    img = Image.fromarray(frame.astype('uint8'), 'RGB')
                    
                    frame_path = f"uploads/frame_{uuid.uuid4()}_{i}_{int(time_point)}.png"
                    img.save(frame_path)
                    frames_data["frame_paths"].append(frame_path)
                    
                except Exception as frame_error:
                    logger.warning(f"Failed to extract frame at {time_point}s: {frame_error}")
                    continue
            
            clip.close()
            logger.info(f"Extracted {len(frames_data['frame_paths'])} strategic frames from {duration}s video")
            return frames_data
            
        except Exception as e:
            logger.error(f"Error extracting strategic frames: {e}")
            raise
    
    async def _analyze_video_narrative(self, frames_data: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Advanced video narrative analysis using GPT-4o with temporal awareness"""
        try:
            frame_paths = frames_data["frame_paths"]
            frame_timestamps = frames_data["frame_timestamps"]
            
            # Prepare images for GPT-4o
            image_messages = []
            for i, frame_path in enumerate(frame_paths):
                with open(frame_path, "rb") as image_file:
                    import base64
                    image_data = base64.b64encode(image_file.read()).decode()
                    timestamp = frame_timestamps[i] if i < len(frame_timestamps) else 0
                    image_messages.append({
                        "type": "image_url", 
                        "image_url": {"url": f"data:image/png;base64,{image_data}"}
                    })
            
            # Create comprehensive analysis prompt based on video metadata
            video_context = f"""
VIDEO CONTEXT:
- Duration: {metadata['duration']:.1f} seconds ({metadata['video_type']})
- Format: {metadata['format_hint']} ({metadata['width']}x{metadata['height']})
- Frame Analysis: {len(frame_paths)} strategic frames extracted
- Timestamps: {[f'{t:.1f}s' for t in frame_timestamps[:5]]}{'...' if len(frame_timestamps) > 5 else ''}
"""
            
            prompt = {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""{video_context}

ADVANCED VIDEO NARRATIVE ANALYSIS:
Analyze these frames as a COMPLETE STORY with temporal progression. Focus on creating soundtracks that match the visual narrative flow.

VISUAL STORYTELLING ANALYSIS:
1. OPENING (First frames): What sets the tone?
2. DEVELOPMENT (Middle frames): How does the story/mood evolve?
3. CLIMAX/PEAK (Peak energy frames): What are the high-energy moments?
4. RESOLUTION (Final frames): How does it conclude?

CINEMATIC ELEMENTS:
- Camera work: Static/handheld, close-ups/wide shots, movement
- Lighting: Natural/artificial, bright/dark, dramatic changes
- Color palette: Warm/cool tones, saturation, contrast
- Composition: Symmetry, depth, focal points
- Visual rhythm: Fast cuts suggested, slow pacing, build-ups

CONTENT CATEGORIZATION:
- Documentary/Educational: Informative, steady pacing, clear narration needs
- Social Media/Personal: Quick cuts, trendy, energetic background music
- Professional/Corporate: Clean, polished, subtle background audio
- Entertainment/Creative: Dynamic, artistic, expressive soundtrack
- Sports/Action: High energy, rhythmic, impactful sound effects
- Nature/Travel: Atmospheric, immersive, environmental sounds

AUDIO LANDSCAPE DESIGN:
For each major section (beginning/middle/end), specify:
- Primary sound effects needed (ambient, action, transitions)
- Music style and energy level (0-10 scale)
- Atmospheric layers (reverb, spatial audio, density)
- Sync points (moments that need precise audio timing)

RESPOND WITH DETAILED JSON:
{{
  "narrative_structure": {{
    "opening": {{"mood": "", "energy": 0-10, "description": "", "audio_needs": ""}},
    "development": {{"mood": "", "energy": 0-10, "description": "", "audio_needs": ""}},
    "climax": {{"mood": "", "energy": 0-10, "description": "", "audio_needs": ""}},
    "resolution": {{"mood": "", "energy": 0-10, "description": "", "audio_needs": ""}}
  }},
  "overall_analysis": {{
    "primary_mood": "dominant emotion throughout",
    "secondary_mood": "secondary emotion if applicable",
    "content_type": "documentary/social/professional/entertainment/sports/nature",
    "visual_style": "cinematic/handheld/static/dynamic",
    "pacing": "slow/medium/fast/variable",
    "confidence": "high/medium/low"
  }},
  "audio_requirements": {{
    "sound_effects_priority": ["list", "of", "specific", "effects", "needed"],
    "music_style": "specific genre and instrumentation",
    "atmospheric_layers": ["ambient", "textures", "needed"],
    "sync_points": [["timestamp", "description"], ["timestamp", "description"]],
    "dynamic_range": "wide/medium/narrow - for mixing decisions"
  }},
  "scene_segments": [
    {{"start_time": 0, "end_time": 10, "mood": "", "energy": 0-10, "description": "", "audio_focus": ""}},
    {{"start_time": 10, "end_time": 20, "mood": "", "energy": 0-10, "description": "", "audio_focus": ""}}
  ]
}}"""
                    }
                ] + image_messages
            }
            
            response = self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[prompt],
                max_tokens=1500,  # Increased for detailed analysis
                temperature=0.1   # Lower temperature for more consistent analysis
            )
            
            # Parse response
            analysis_text = response.choices[0].message.content
            logger.info(f"Advanced video narrative analysis generated: {len(analysis_text)} characters")
            
            try:
                analysis = json.loads(analysis_text)
                
                # Validate and enhance analysis structure
                if "overall_analysis" in analysis:
                    primary_mood = analysis["overall_analysis"].get("primary_mood", "neutral")
                    content_type = analysis["overall_analysis"].get("content_type", "general")
                    confidence = analysis["overall_analysis"].get("confidence", "medium")
                    
                    logger.info(f"Video analysis complete: {primary_mood} mood, {content_type} type, {confidence} confidence")
                else:
                    logger.warning("Analysis missing overall_analysis section, adding defaults")
                    analysis["overall_analysis"] = {
                        "primary_mood": "neutral",
                        "content_type": "general", 
                        "confidence": "low"
                    }
                
                # Add metadata to analysis
                analysis["metadata"] = metadata
                analysis["frames_analyzed"] = len(frame_paths)
                
            except json.JSONDecodeError:
                logger.warning("Failed to parse advanced video analysis, using enhanced fallback")
                analysis = self._create_fallback_video_analysis(metadata)
            
            # Clean up frame files
            for frame_path in frame_paths:
                if os.path.exists(frame_path):
                    os.unlink(frame_path)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing video scenes: {e}")
            # Return enhanced fallback that works well for most videos
            return {
                "mood": "neutral",
                "confidence": "low",
                "visual_indicators": f"Analysis failed: {str(e)}",
                "setting": "general indoor/outdoor scene", 
                "action": "people or objects in motion",
                "sound_effects": "subtle ambient background sounds with natural room tone",
                "background_music": "soft instrumental background music with gentle melody"
            }
    
    async def _generate_video_effects(self, scene_analysis: Dict[str, Any]) -> AudioSegment:
        """Generate sound effects for video based on scene analysis via HTTP API"""
        try:
            effects_prompt = scene_analysis.get("sound_effects", "ambient sounds")
            
            logger.info(f"Generating video sound effects with prompt: {effects_prompt}")
            
            # Trim prompt to fit ElevenLabs 450 character limit
            trimmed_prompt = effects_prompt[:450] if len(effects_prompt) > 450 else effects_prompt
            
            # Direct HTTP call to ElevenLabs Sound Generation API for video effects
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            data = {
                "text": trimmed_prompt,
                "duration_seconds": 10.0,
                "prompt_influence": 0.5
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated video sound effects: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Video Effects API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating video effects: {e}")
            return AudioSegment.silent(duration=1000)
    
    async def _generate_adaptive_music(self, scene_analysis: Dict[str, Any]) -> AudioSegment:
        """Generate adaptive background music for video via HTTP API"""
        try:
            mood = scene_analysis.get("mood", "neutral")
            setting = scene_analysis.get("setting", "general")
            
            music_prompt = f"Cinematic {mood} {setting} background music, orchestral, atmospheric, film score"
            
            logger.info(f"Generating adaptive music with prompt: {music_prompt}")
            
            # Trim prompt to fit ElevenLabs 450 character limit  
            trimmed_prompt = music_prompt[:450] if len(music_prompt) > 450 else music_prompt
            
            # Direct HTTP call to ElevenLabs Sound Generation API for adaptive music
            url = "https://api.elevenlabs.io/v1/sound-generation"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            }
            data = {
                "text": trimmed_prompt,
                "duration_seconds": 15.0,
                "prompt_influence": 0.4
            }
            
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save temporary file - response content is audio bytes
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                temp_file.write(response.content)
                temp_file.close()
                
                # Load as AudioSegment
                audio = AudioSegment.from_mp3(temp_file.name)
                os.unlink(temp_file.name)
                
                logger.info(f"Successfully generated adaptive music: {len(audio)}ms duration")
                return audio
            else:
                logger.error(f"ElevenLabs Adaptive Music API error: {response.status_code} - {response.text}")
                return AudioSegment.silent(duration=1000)
            
        except Exception as e:
            logger.error(f"Error generating adaptive music: {e}")
            return AudioSegment.silent(duration=1000)
    
    async def _create_effects_prompt(self, text: str, mood: str) -> str:
        """Create sound effects prompt from text analysis"""
        try:
            # Use GPT to analyze text and suggest CONCISE sound effects for ElevenLabs (max 400 chars)
            analysis_prompt = f"""Create a concise sound effects description (maximum 400 characters) for audio generation:

Text: "{text[:200]}"
Mood: {mood}

Generate a brief, specific description of key sound effects. Include only the most important sounds: environmental audio, main actions, and mood elements.

Respond with ONLY the sound effects description (no explanations), under 400 characters."""
            
            response = self.openai.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=150,
                temperature=0.7
            )
            
            effects_description = response.choices[0].message.content.strip()
            logger.info(f"AI-generated effects description: {effects_description}")
            return effects_description
            
        except Exception as e:
            logger.error(f"Error creating effects prompt: {e}")
            # Fallback to simple mood-based effects
            fallback_effects = {
                "happy": "gentle bells, light wind chimes, soft nature sounds",
                "sad": "soft rain, distant thunder, melancholy piano notes",
                "dramatic": "deep rumbles, tension-building crescendo, cinematic impact",
                "peaceful": "gentle water flowing, birds chirping, soft wind",
                "energetic": "upbeat percussion, dynamic movement sounds, vibrant atmosphere",
                "mysterious": "subtle whispers, creaking sounds, ambient mystery tones",
                "romantic": "soft strings, gentle wind, warm atmospheric tones"
            }
            return fallback_effects.get(mood, f"ambient {mood} atmospheric sounds")
    
    async def _mix_audio_layers(self, 
                              dialogue: Optional[AudioSegment],
                              effects: Optional[AudioSegment], 
                              music: Optional[AudioSegment],
                              job_id: str,
                              dialogue_level: int = 0,
                              effects_level: int = -8,
                              music_level: int = -12) -> str:
        """Mix multiple audio layers into final soundtrack with clean mixing"""
        try:
            # Determine base duration and start with appropriate base layer
            if dialogue:
                final_audio = dialogue
                # Apply user-defined dialogue level adjustment
                if dialogue_level != 0:
                    final_audio = final_audio + dialogue_level
                base_duration = len(dialogue)
            elif effects:
                # If no dialogue but we have effects, use effects duration
                base_duration = len(effects)
                final_audio = AudioSegment.silent(duration=base_duration)
            elif music:
                # If no dialogue or effects but we have music, use music duration
                base_duration = len(music)
                final_audio = AudioSegment.silent(duration=base_duration)
            else:
                # Fallback case (shouldn't happen due to validation)
                base_duration = 10000  # 10 seconds default
                final_audio = AudioSegment.silent(duration=base_duration)
            
            # Add effects layer with user-defined volume control
            if effects:
                # Adjust effects to match duration with user-defined volume reduction
                effects = effects[:base_duration]
                effects = effects + effects_level  # User-defined effects level
                final_audio = final_audio.overlay(effects)
            
            # Add music layer with user-defined volume control
            if music:
                # Adjust music to match duration with user-defined volume reduction
                music = music[:base_duration]
                music = music + music_level  # User-defined music level
                final_audio = final_audio.overlay(music)
            
            # Normalize volume to prevent clipping but maintain clarity
            final_audio = final_audio.normalize()
            
            # Export final audio
            output_path = f"generated/soundtrack_{job_id}.mp3"
            final_audio.export(output_path, format="mp3", bitrate="192k")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error mixing audio layers: {e}")
            raise
    
    async def _mix_video_soundtrack(self,
                                  video_path: str,
                                  effects: Optional[AudioSegment],
                                  music: Optional[AudioSegment], 
                                  job_id: str) -> str:
        """Mix soundtrack for video file with clean audio"""
        try:
            # Get video duration
            clip = VideoFileClip(video_path)
            video_duration = int(clip.duration * 1000)  # Convert to milliseconds
            clip.close()
            
            # Start with silence matching video duration
            final_audio = AudioSegment.silent(duration=video_duration)
            
            # Add effects layer with balanced volume control
            if effects:
                # Loop or extend effects to match video duration
                while len(effects) < video_duration:
                    effects = effects + effects
                effects = effects[:video_duration]
                effects = effects - 8  # Moderate reduction for audible effects
                final_audio = final_audio.overlay(effects)
            
            # Add music layer as audible background
            if music:
                # Loop music to match video duration
                while len(music) < video_duration:
                    music = music + music
                music = music[:video_duration]
                music = music - 12  # Gentle reduction for audible background music
                final_audio = final_audio.overlay(music)
            
            # Normalize to prevent clipping while maintaining clarity
            final_audio = final_audio.normalize()
            
            # Export final audio
            output_path = f"generated/video_soundtrack_{job_id}.mp3"
            final_audio.export(output_path, format="mp3", bitrate="192k")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error mixing video soundtrack: {e}")
            raise

# Initialize soundtrack generator
soundtrack_generator = SoundtrackGenerator()

@app.get("/", response_class=HTMLResponse)
async def main_page(request: Request):
    """Main application page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Soundtrack Generator"}

@app.post("/api/generate-text-soundtrack")
async def generate_text_soundtrack(
    background_tasks: BackgroundTasks,
    dialogue_text: str = Form(default=""),
    voice_id: str = Form(default="default"),
    voice_speed: float = Form(default=1.0),
    voice_stability: float = Form(default=0.5),
    effects_description: str = Form(default=""),
    effects_duration: int = Form(default=8),
    effects_prompt_influence: float = Form(default=0.3),
    music_description: str = Form(default=""),
    music_duration: int = Form(default=15),
    music_prompt_influence: float = Form(default=0.2),
    mood: str = Form(default="neutral"),
    output_quality: str = Form(default="mp3_22050_32"),
    dialogue_level: int = Form(default=0),
    effects_level: int = Form(default=-8),
    music_level: int = Form(default=-12)
):
    """Generate soundtrack from separate component descriptions"""
    try:
        # Validate that at least one component is requested
        has_dialogue = bool(dialogue_text and dialogue_text.strip())
        has_effects = bool(effects_description and effects_description.strip())
        has_music = bool(music_description and music_description.strip())
        
        if not has_dialogue and not has_effects and not has_music:
            raise HTTPException(
                status_code=400, 
                detail="At least one component must be specified: dialogue text, effects description, or music description"
            )
        
        job_id = await soundtrack_generator.generate_custom_soundtrack(
            dialogue_text=dialogue_text,
            voice_id=voice_id,
            voice_speed=voice_speed,
            voice_stability=voice_stability,
            effects_description=effects_description,
            effects_duration=effects_duration,
            effects_prompt_influence=effects_prompt_influence,
            music_description=music_description,
            music_duration=music_duration,
            music_prompt_influence=music_prompt_influence,
            mood=mood,
            output_quality=output_quality,
            dialogue_level=dialogue_level,
            effects_level=effects_level,
            music_level=music_level
        )
        
        return {"job_id": job_id, "status": "processing"}
        
    except Exception as e:
        logger.error(f"Error in text soundtrack generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/job-status/{job_id}")
async def get_job_status(job_id: str):
    """Get processing job status"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]

@app.get("/api/download/{job_id}")
async def download_soundtrack(job_id: str):
    """Download generated soundtrack"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = processing_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    file_path = job["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=f"soundtrack_{job_id}.mp3",
        media_type="audio/mpeg"
    )

@app.get("/api/voices")
async def get_available_voices():
    """Get list of available ElevenLabs voices via direct HTTP API"""
    try:
        # Use direct HTTP API call (same as we used successfully in terminal)
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            voices_data = response.json()
            
            # Format voices for frontend dropdown
            formatted_voices = []
            for voice in voices_data.get("voices", []):
                # Get voice characteristics for better descriptions
                labels = voice.get("labels", {})
                gender = labels.get("gender", "unknown")
                age = labels.get("age", "unknown") 
                accent = labels.get("accent", "unknown")
                descriptive = labels.get("descriptive", "unknown")
                
                # Create readable description
                characteristics = []
                if gender != "unknown":
                    characteristics.append(gender)
                if age != "unknown":
                    characteristics.append(age)
                if accent != "unknown":
                    characteristics.append(accent)
                if descriptive != "unknown":
                    characteristics.append(descriptive)
                
                readable_description = f"{voice.get('description', '')}"
                if characteristics:
                    readable_description = f"({', '.join(characteristics)}) {readable_description}"
                
                formatted_voices.append({
                    "voice_id": voice.get("voice_id", ""),
                    "name": voice.get("name", "Unknown"),
                    "category": voice.get("category", "custom"),
                    "description": readable_description.strip()
                })
            
            # Sort voices: premade first, then custom, then alphabetically by name
            def sort_key(voice):
                category_priority = {"premade": 0, "professional": 1, "cloned": 2, "custom": 3}
                return (category_priority.get(voice["category"], 4), voice["name"])
            
            formatted_voices.sort(key=sort_key)
            
            logger.info(f"Successfully fetched {len(formatted_voices)} ElevenLabs voices")
            return {"voices": formatted_voices}
            
        else:
            logger.error(f"ElevenLabs voices API error: {response.status_code} - {response.text}")
            raise Exception(f"API returned {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        # Return a few popular default voices as fallback
        return {
            "voices": [
                {"voice_id": "iP95p4xoKVk53GoZ742B", "name": "Chris", "category": "premade", "description": "(male, middle-aged, american, casual) Natural and real voice"},
                {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "category": "premade", "description": "(female, young, american, professional) Confident and warm voice"},
                {"voice_id": "SAz9YHcvj6GT2YYXdXww", "name": "River", "category": "premade", "description": "(neutral, middle-aged, american, calm) Relaxed, neutral voice"},
                {"voice_id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "category": "premade", "description": "(male, middle-aged, british, mature) Warm resonance voice"}
            ]
        }

    async def _generate_scene_specific_effects(self, scene_analysis: Dict[str, Any], video_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate scene-specific sound effects based on detailed AI analysis"""
        try:
            effects_segments = []
            video_duration = video_metadata.get('duration', 30.0)
            
            # Extract key audio requirements from scene analysis
            audio_requirements = scene_analysis.get('audio_requirements', {})
            primary_effects = audio_requirements.get('primary_effects', [])
            ambient_sounds = audio_requirements.get('ambient_sounds', [])
            
            # Generate effects for each scene transition
            scene_transitions = scene_analysis.get('scene_transitions', [])
            segment_duration = video_duration / max(len(scene_transitions), 1)
            
            for i, transition in enumerate(scene_transitions):
                start_time = i * segment_duration
                end_time = min((i + 1) * segment_duration, video_duration)
                
                # Determine effect type based on scene content
                scene_description = transition.get('description', '')
                effects_needed = transition.get('effects_needed', [])
                
                # Create contextual effects prompt
                if effects_needed:
                    effects_prompt = f"Scene-specific effects: {', '.join(effects_needed[:3])}"
                elif primary_effects:
                    effects_prompt = f"Primary effects for {scene_description}: {primary_effects[0]}"
                else:
                    effects_prompt = f"General ambience for: {scene_description}"
                
                # Generate audio segment
                segment_duration_seconds = min(max(int(end_time - start_time), 3), 22)
                effects_audio = await self._generate_custom_sound_effects(
                    effects_prompt, 
                    segment_duration_seconds,
                    scene_analysis.get('overall_mood', 'neutral')
                )
                
                effects_segments.append({
                    'audio': effects_audio,
                    'start_time': start_time,
                    'end_time': end_time,
                    'description': effects_prompt
                })
            
            logger.info(f"Generated {len(effects_segments)} scene-specific effects segments")
            return effects_segments
            
        except Exception as e:
            logger.error(f"Error generating scene-specific effects: {e}")
            # Fallback to single comprehensive effect
            fallback_prompt = scene_analysis.get('comprehensive_description', 'General video ambience')
            fallback_audio = await self._generate_custom_sound_effects(fallback_prompt, 15, 'neutral')
            return [{
                'audio': fallback_audio,
                'start_time': 0,
                'end_time': video_metadata.get('duration', 30.0),
                'description': 'Fallback comprehensive effects'
            }]
    
    async def _generate_dynamic_music_score(self, scene_analysis: Dict[str, Any], video_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate dynamic music score that adapts to scene progression"""
        try:
            music_segments = []
            video_duration = video_metadata.get('duration', 30.0)
            
            # Extract musical requirements from analysis
            audio_requirements = scene_analysis.get('audio_requirements', {})
            music_style = audio_requirements.get('music_style', 'atmospheric background music')
            emotional_arc = scene_analysis.get('emotional_arc', [])
            
            # Generate music segments based on emotional progression
            if emotional_arc:
                segment_count = min(len(emotional_arc), 3)  # Max 3 music segments for variety
                segment_duration = video_duration / segment_count
                
                for i, emotion in enumerate(emotional_arc[:segment_count]):
                    start_time = i * segment_duration
                    end_time = min((i + 1) * segment_duration, video_duration)
                    
                    # Create emotionally-aware music prompt
                    music_prompt = f"{emotion.get('emotion', 'neutral')} {music_style} with {emotion.get('intensity', 'moderate')} intensity"
                    
                    # Generate music segment
                    segment_duration_seconds = min(max(int(end_time - start_time), 10), 22)
                    music_audio = await self._generate_custom_background_music(
                        music_prompt,
                        segment_duration_seconds,
                        emotion.get('emotion', 'neutral')
                    )
                    
                    music_segments.append({
                        'audio': music_audio,
                        'start_time': start_time,
                        'end_time': end_time,
                        'emotion': emotion.get('emotion', 'neutral'),
                        'description': music_prompt
                    })
            else:
                # Single comprehensive music track
                music_prompt = f"{music_style} for {scene_analysis.get('overall_mood', 'neutral')} video content"
                music_audio = await self._generate_custom_background_music(music_prompt, 22, 'neutral')
                
                music_segments.append({
                    'audio': music_audio,
                    'start_time': 0,
                    'end_time': video_duration,
                    'emotion': 'neutral',
                    'description': music_prompt
                })
            
            logger.info(f"Generated {len(music_segments)} dynamic music segments")
            return music_segments
            
        except Exception as e:
            logger.error(f"Error generating dynamic music score: {e}")
            # Fallback to single music track
            fallback_prompt = f"Background music for {scene_analysis.get('overall_mood', 'neutral')} video"
            fallback_audio = await self._generate_custom_background_music(fallback_prompt, 20, 'neutral')
            return [{
                'audio': fallback_audio,
                'start_time': 0,
                'end_time': video_metadata.get('duration', 30.0),
                'emotion': 'neutral',
                'description': 'Fallback background music'
            }]
    
    async def _generate_atmospheric_layers(self, scene_analysis: Dict[str, Any], video_metadata: Dict[str, Any]) -> AudioSegment:
        """Generate atmospheric layers for depth and immersion"""
        try:
            # Extract atmospheric requirements
            audio_requirements = scene_analysis.get('audio_requirements', {})
            ambient_sounds = audio_requirements.get('ambient_sounds', [])
            overall_environment = scene_analysis.get('environment', {})
            
            # Create atmospheric prompt based on environment analysis
            if ambient_sounds:
                atmospheric_prompt = f"Subtle ambient atmosphere: {', '.join(ambient_sounds[:2])}"
            elif overall_environment:
                location = overall_environment.get('primary_location', 'general environment')
                time_of_day = overall_environment.get('time_of_day', 'daytime')
                atmospheric_prompt = f"Subtle {time_of_day} ambient atmosphere for {location}"
            else:
                atmospheric_prompt = "Gentle atmospheric background ambience"
            
            # Generate atmospheric layer with longer duration for looping
            atmospheric_duration = min(int(video_metadata.get('duration', 30.0)), 22)
            atmospheric_audio = await self._generate_custom_sound_effects(
                atmospheric_prompt,
                atmospheric_duration,
                'peaceful'
            )
            
            # Reduce volume significantly for atmospheric layer
            atmospheric_audio = atmospheric_audio - 18  # Very subtle background layer
            
            logger.info(f"Generated atmospheric layer: {atmospheric_prompt}")
            return atmospheric_audio
            
        except Exception as e:
            logger.error(f"Error generating atmospheric layers: {e}")
            # Return silent audio as fallback
            return AudioSegment.silent(duration=int(video_metadata.get('duration', 30.0) * 1000))
    
    async def _create_synchronized_soundtrack(self,
                                           video_path: str,
                                           effects_segments: List[Dict[str, Any]],
                                           music_segments: List[Dict[str, Any]],
                                           ambient_audio: AudioSegment,
                                           scene_analysis: Dict[str, Any],
                                           video_metadata: Dict[str, Any],
                                           job_id: str) -> str:
        """Create synchronized soundtrack with advanced mixing"""
        try:
            # Get video duration
            video_duration_ms = int(video_metadata.get('duration', 30.0) * 1000)
            
            # Create base audio track with silence
            final_audio = AudioSegment.silent(duration=video_duration_ms)
            
            # Layer effects segments
            if effects_segments:
                for segment in effects_segments:
                    start_ms = int(segment['start_time'] * 1000)
                    end_ms = int(segment['end_time'] * 1000)
                    segment_audio = segment['audio']
                    
                    # Trim or pad audio to fit time slot
                    required_duration = end_ms - start_ms
                    if len(segment_audio) > required_duration:
                        segment_audio = segment_audio[:required_duration]
                    elif len(segment_audio) < required_duration:
                        # Loop if necessary
                        while len(segment_audio) < required_duration:
                            segment_audio = segment_audio + segment_audio
                        segment_audio = segment_audio[:required_duration]
                    
                    # Apply effects at moderate volume
                    segment_audio = segment_audio - 6  # Moderate reduction for clear effects
                    
                    # Overlay on final track
                    final_audio = final_audio.overlay(segment_audio, position=start_ms)
            
            # Layer music segments
            if music_segments:
                for segment in music_segments:
                    start_ms = int(segment['start_time'] * 1000)
                    end_ms = int(segment['end_time'] * 1000)
                    segment_audio = segment['audio']
                    
                    # Trim or pad audio to fit time slot
                    required_duration = end_ms - start_ms
                    if len(segment_audio) > required_duration:
                        segment_audio = segment_audio[:required_duration]
                    elif len(segment_audio) < required_duration:
                        # Loop if necessary
                        while len(segment_audio) < required_duration:
                            segment_audio = segment_audio + segment_audio
                        segment_audio = segment_audio[:required_duration]
                    
                    # Apply music at background level
                    segment_audio = segment_audio - 10  # Background music level
                    
                    # Overlay on final track
                    final_audio = final_audio.overlay(segment_audio, position=start_ms)
            
            # Add atmospheric layer across entire video
            if len(ambient_audio) > 0:
                # Loop atmospheric audio to match video duration
                while len(ambient_audio) < video_duration_ms:
                    ambient_audio = ambient_audio + ambient_audio
                ambient_audio = ambient_audio[:video_duration_ms]
                
                # Overlay atmospheric layer at very low volume
                final_audio = final_audio.overlay(ambient_audio)
            
            # Normalize final audio to prevent clipping
            final_audio = final_audio.normalize()
            
            # Export synchronized soundtrack
            output_path = f"generated/video_soundtrack_{job_id}.mp3"
            final_audio.export(output_path, format="mp3", bitrate="192k")
            
            logger.info(f"Created synchronized soundtrack with {len(effects_segments)} effects and {len(music_segments)} music segments")
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating synchronized soundtrack: {e}")
            # Fallback to simple mixing
            return await self._mix_video_soundtrack(video_path, 
                                                  effects_segments[0]['audio'] if effects_segments else None,
                                                  music_segments[0]['audio'] if music_segments else None,
                                                  job_id)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5009))
    uvicorn.run(app, host="0.0.0.0", port=port)