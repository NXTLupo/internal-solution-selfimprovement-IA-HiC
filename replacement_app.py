#!/usr/bin/env python3
"""
Direct replacement for the app.py file with the API key hardcoded.
This should be copied to /app/src/app.py in the container.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import logging
import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any, Set
import shutil

# Force set API key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["USE_WHISPER_API"] = "true"

# Import modules after setting environment variables
from .models import (
    Job, JobStatus, JobProgress, AnalyzeUrlRequest, AnalysisRequest, 
    JobResponse, AnalysisResponse, AnalysisType, VideoInfo,
    TranscriptionResult, TranscriptSegment
)
from .storage import JobStorage
from .transcription.youtube_fetcher import (
    fetch_video_info, download_youtube_video, fetch_youtube_captions,
    get_audio_duration, extract_audio_from_video
)

# Import both transcription methods - will choose based on configuration
from .transcription.whisper_transcriber import (
    transcribe_audio, transcribe_audio_chunks, generate_srt
)
from .transcription.openai_whisper_api import (
    transcribe_audio_with_api, transcribe_audio_chunks_with_api
)
# Import robust Whisper API implementation
from .transcription.robust_whisper_api import transcribe_long_audio_robust

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger("video-analyzer")

# Check if we should use the OpenAI Whisper API
USE_WHISPER_API = os.getenv("USE_WHISPER_API", "").lower() in ["true", "1", "yes", "y"]
if USE_WHISPER_API:
    # Check if we have an OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("USE_WHISPER_API is set but OPENAI_API_KEY is not set. Falling back to local Whisper model.")
        USE_WHISPER_API = False
    else:
        logger.info("Using OpenAI Whisper API for transcription")
else:
    logger.info("Using local Whisper model for transcription")

# Initialize FastAPI app
app = FastAPI(
    title="Video Analyzer API",
    description="API for analyzing videos from YouTube or direct uploads",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create directories
os.makedirs("storage", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("transcripts", exist_ok=True)
os.makedirs("temp", exist_ok=True)
os.makedirs("progress", exist_ok=True)  # For tracking transcription progress

# Initialize storage
job_storage = JobStorage("./storage")

# Active WebSocket connections for progress updates
active_connections: Dict[str, Set[WebSocket]] = {}

# Helper functions
async def send_progress_update(job_id: str, progress: JobProgress):
    """Send progress updates to all connected clients for this job."""
    if job_id in active_connections:
        disconnected_websockets = set()
        for websocket in active_connections[job_id]:
            try:
                await websocket.send_json(progress.dict())
            except Exception as e:
                logger.error(f"Error sending progress update: {e}")
                disconnected_websockets.add(websocket)
        
        # Remove disconnected websockets
        for ws in disconnected_websockets:
            active_connections[job_id].remove(ws)
            
        if disconnected_websockets:
            logger.info(f"Removed {len(disconnected_websockets)} disconnected WebSockets for job {job_id}")

# Choose the appropriate transcription function based on configuration
async def transcribe_with_selected_method(
    audio_path: str,
    language: Optional[str] = None,
    is_long_audio: bool = False,
    job_id: Optional[str] = None
) -> TranscriptionResult:
    """
    Transcribe audio using either the OpenAI Whisper API or local Whisper model
    based on configuration.
    
    Args:
        audio_path: Path to audio file
        language: Optional language code
        is_long_audio: Whether audio is longer than 10 minutes
        job_id: Optional job ID for progress tracking and resuming
    """
    if USE_WHISPER_API:
        logger.info("Transcribing with OpenAI Whisper API")
        
        # Always use robust API with intelligent chunking for all videos
        # This handles both short and long videos automatically with multipart size prediction
        if job_id:
            logger.info("Using robust Whisper API with intelligent chunking")
            return await transcribe_long_audio_robust(audio_path, job_id, language)
        else:
            # Fallback only if no job_id provided (should be rare)
            logger.warning("No job_id provided, using fallback transcription method")
            if is_long_audio:
                return await transcribe_audio_chunks_with_api(audio_path, language)
            else:
                return await transcribe_audio_with_api(audio_path, language)
    else:
        logger.info("Transcribing with local Whisper model")
        if is_long_audio:
            return await transcribe_audio_chunks(audio_path, language)
        else:
            return await transcribe_audio(audio_path, language)

# Rest of app.py file goes here...

# Test API key
from openai import OpenAI
try:
    client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info(f"OpenAI API key configured: {bool(OPENAI_API_KEY)}, length: {len(OPENAI_API_KEY)}")
    logger.info(f"OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"Error initializing OpenAI client: {str(e)}")