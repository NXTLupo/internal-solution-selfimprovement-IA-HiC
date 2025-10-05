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

# Import and run set_env.py to ensure environment variables are set
try:
    import set_env
except ImportError:
    pass

# Force set OpenAI API key
# API key loaded from root .env file by load_env.py
os.environ['USE_WHISPER_API'] = 'true'

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
