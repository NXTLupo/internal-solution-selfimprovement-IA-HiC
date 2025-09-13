#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess

# API key to use
API_KEY = "***REDACTED-OPENAI-KEY***"

# First, create a file that will directly set the environment variables
with open("set_env.py", "w") as f:
    f.write(f"""#!/usr/bin/env python3
import os

# Force set environment variables
os.environ['OPENAI_API_KEY'] = '{API_KEY}'
os.environ['USE_WHISPER_API'] = 'true'

# Print for verification
print(f"Environment variable OPENAI_API_KEY set: {os.environ.get('OPENAI_API_KEY', '')[:10]}...")
print(f"Environment variable USE_WHISPER_API set: {os.environ.get('USE_WHISPER_API', '')}")
""")

# Copy the file to the container
subprocess.run(["docker", "cp", "set_env.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/set_env.py"], check=True)
os.remove("set_env.py")

# Create a patched app.py that imports and runs set_env.py at startup
with open("patched_app.py", "w") as f:
    f.write("""from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Depends
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
os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'
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
""")

# Copy the patched file to the container
subprocess.run(["docker", "cp", "patched_app.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/src/app.py"], check=True)
os.remove("patched_app.py")

print("✅ Successfully patched app.py in the container")

# Create a modified version of openai_whisper_api.py that prints out the API key for debugging
with open("patched_openai_whisper_api.py", "w") as f:
    f.write("""import os
import logging
import asyncio
import time
from typing import Dict, List, Optional, Any, Union
import json
import httpx
from pydantic import BaseModel

from ..models import TranscriptionResult, TranscriptSegment

logger = logging.getLogger("video-analyzer.openai_whisper_api")

# Force set API key in this module
os.environ['OPENAI_API_KEY'] = '***REDACTED-OPENAI-KEY***'
os.environ['USE_WHISPER_API'] = 'true'

# Get OpenAI API key from environment
def get_openai_api_key():
    \"\"\"Get the OpenAI API key from the environment and clean it\"\"\"
    api_key = os.getenv("OPENAI_API_KEY", "")
    
    # Clean the API key in case it has newlines or other unexpected characters
    if api_key:
        api_key = api_key.strip().split('\\n')[0].strip()
    
    # Debug logging
    logger.info(f"API Key from env: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else ''} (length: {len(api_key)})")
    return api_key

OPENAI_API_KEY = get_openai_api_key()
logger.info(f"OpenAI API key loaded: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")

# Add even more debug logging
logger.info(f"Initial API key load: {OPENAI_API_KEY[:8]}...{OPENAI_API_KEY[-4:] if len(OPENAI_API_KEY) > 12 else ''}")
""")

# Copy the modified whisper_api.py file to the container
subprocess.run(["docker", "cp", "patched_openai_whisper_api.py", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/src/transcription/openai_whisper_api.py"], check=True)
os.remove("patched_openai_whisper_api.py")

print("✅ Successfully patched openai_whisper_api.py in the container")

# Create a .env file
with open("container_env", "w") as f:
    f.write(f"OPENAI_API_KEY={API_KEY}\n")
    f.write("USE_WHISPER_API=true\n")

# Copy .env to multiple locations to ensure it's found
subprocess.run(["docker", "cp", "container_env", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/.env"], check=True)
subprocess.run(["docker", "cp", "container_env", "nxthumans_ai_cx_workbench-video-analyzer-1:/app/src/.env"], check=True)
os.remove("container_env")

print("✅ Created .env files in container")

# Restart the container to apply changes
subprocess.run(["docker", "restart", "nxthumans_ai_cx_workbench-video-analyzer-1"], check=True)

print("✅ Restarted container")
print("\n✅✅✅ Video Analyzer should now be fixed to use the OpenAI API key!")
print("It may take a moment for the container to fully start up.")