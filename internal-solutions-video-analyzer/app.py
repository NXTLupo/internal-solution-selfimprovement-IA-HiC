# Load environment variables first
import load_env

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
import os
import time
import logging
import uuid
import subprocess
import json
from datetime import datetime
import yt_dlp
import re
import tempfile
from pydub import AudioSegment
import shutil
import requests
import base64
from openai import OpenAI

# Pydantic model for YouTube URL
class YouTubeAnalysisRequest(BaseModel):
    url: str

# OpenAI API key (should be set as environment variable in production)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("video-analyzer")

app = FastAPI(title="Video Analyzer")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Directories
UPLOAD_DIR = "uploads"
TRANSCRIPT_DIR = "transcripts"
TEMP_DIR = "temp"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Mock data for active jobs
active_jobs = {}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Root endpoint - serves the HTML frontend"""
    with open("static/index.html", "r") as f:
        html_content = f.read()
    return html_content

@app.get("/api")
async def read_api_root():
    """API endpoint"""
    return {"message": "NXT Humans Video Analyzer API"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "running"}

@app.post("/upload-video")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a video for processing"""
    try:
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Save the file
        file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Create job entry
        active_jobs[job_id] = {
            "id": job_id,
            "filename": file.filename,
            "file_path": file_path,
            "status": "processing",
            "start_time": datetime.now().isoformat(),
            "progress": 0,
        }
        
        # Process video in background
        background_tasks.add_task(process_video, job_id, file_path)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Video upload successful, processing started"
        }
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error uploading video: {str(e)}"}
        )

@app.post("/analyze-youtube")
async def analyze_youtube(
    background_tasks: BackgroundTasks,
    request: YouTubeAnalysisRequest,
):
    """Analyze a YouTube video by URL"""
    try:
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Extract YouTube video ID (for display purposes)
        youtube_url = request.url
        video_id = "unknown"
        
        # Simple URL parsing to extract video ID
        if "youtube.com/watch?v=" in youtube_url:
            video_id = youtube_url.split("youtube.com/watch?v=")[1].split("&")[0]
        elif "youtu.be/" in youtube_url:
            video_id = youtube_url.split("youtu.be/")[1].split("?")[0]
            
        filename = f"youtube_{video_id}"
        
        # Create job entry
        active_jobs[job_id] = {
            "id": job_id,
            "filename": filename,
            "youtube_url": youtube_url,
            "status": "processing",
            "start_time": datetime.now().isoformat(),
            "progress": 0,
        }
        
        # Process YouTube video in background (mock)
        background_tasks.add_task(process_youtube_video, job_id, youtube_url)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "YouTube video analysis started"
        }
    except Exception as e:
        logger.error(f"Error analyzing YouTube video: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error analyzing YouTube video: {str(e)}"}
        )

def format_timestamp(seconds):
    """Convert seconds to a formatted timestamp (HH:MM:SS)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

async def process_video(job_id: str, file_path: str):
    """Real video processing function using FFmpeg and Whisper API"""
    temp_dir = None
    try:
        logger.info(f"Starting video processing for job {job_id}")
        
        # Create a temporary directory for processing files
        temp_dir = tempfile.mkdtemp(dir=TEMP_DIR)
        active_jobs[job_id]["progress"] = 10
        
        # Extract audio from video using FFmpeg (as MP3 for Whisper API)
        audio_file = os.path.join(temp_dir, f"{job_id}_audio.mp3")
        logger.info(f"Extracting audio from video: {file_path} to {audio_file}")
        
        cmd = [
            'ffmpeg', '-i', file_path, 
            '-vn', '-acodec', 'libmp3lame', 
            '-ar', '44100', '-ac', '2', '-q:a', '4',
            audio_file
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        active_jobs[job_id]["progress"] = 50
        
        # Transcribe using Whisper API
        logger.info(f"Transcribing audio with Whisper API")
        active_jobs[job_id]["progress"] = 60
        
        try:
            # Call Whisper API for transcription
            transcript_data = await transcribe_with_whisper(audio_file)
            active_jobs[job_id]["progress"] = 90
            
            # Format the transcript with timestamps from the Whisper API response
            transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
            
            with open(transcript_path, "w") as f:
                f.write(f"Video File: {os.path.basename(file_path)}\n\n")
                f.write("==== WHISPER TRANSCRIPTION ====\n\n")
                
                # Write the full transcript
                f.write(transcript_data.text + "\n\n")
                
                # Write segments with timestamps
                f.write("==== TRANSCRIPT WITH TIMESTAMPS ====\n\n")
                
                for segment in transcript_data.segments:
                    start_time = format_timestamp(segment.start)
                    end_time = format_timestamp(segment.end)
                    text = segment.text.strip()
                    f.write(f"[{start_time} - {end_time}] {text}\n")
        
        except Exception as e:
            logger.error(f"Error with Whisper API, falling back to simple speech detection: {str(e)}")
            active_jobs[job_id]["progress"] = 70
            
            # Fallback to speech segment detection
            cmd = [
                'ffmpeg', '-i', audio_file, 
                '-af', 'silencedetect=n=-30dB:d=0.5', 
                '-f', 'null', '-'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = result.stderr
            
            # Parse the silence detection output
            silence_starts = re.findall(r'silence_start: (\d+\.\d+)', output)
            silence_ends = re.findall(r'silence_end: (\d+\.\d+)', output)
            
            # Create transcript with detected speech segments
            transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
            with open(transcript_path, "w") as f:
                f.write(f"Video File: {os.path.basename(file_path)}\n\n")
                f.write("==== AUDIO SEGMENTS ====\n\n")
                
                # If we have silence markers, use them to identify speech segments
                if silence_starts and silence_ends:
                    # Ensure we start from the beginning
                    if float(silence_starts[0]) > 0:
                        f.write(f"[00:00:00 - {format_timestamp(float(silence_starts[0]))}] Speech segment\n")
                    
                    # Process middle segments
                    for i in range(min(len(silence_ends), len(silence_starts))):
                        end_time = float(silence_ends[i])
                        
                        if i < len(silence_starts):
                            start_time = float(silence_starts[i])
                            f.write(f"[{format_timestamp(end_time)} - {format_timestamp(start_time)}] Speech segment\n")
                else:
                    f.write("No clear speech segments detected. The audio may be continuous or very quiet.\n")
                    
                f.write("\n==== NOTE ====\n")
                f.write("Failed to use Whisper API for transcription. Falling back to speech detection.\n")
                f.write(f"Error: {str(e)}\n")
        
        active_jobs[job_id]["progress"] = 95
        
        # Clean up temp files but keep the transcript
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        # Update job status
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["end_time"] = datetime.now().isoformat()
        active_jobs[job_id]["transcript_path"] = transcript_path
        active_jobs[job_id]["progress"] = 100
        
        logger.info(f"Video processing completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        
        # Update job status to failed
        if job_id in active_jobs:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)
            
        # Clean up temp directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        active_jobs[job_id]["progress"] = 95
        
        # Clean up temp files but keep the transcript
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        # Update job status
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["end_time"] = datetime.now().isoformat()
        active_jobs[job_id]["transcript_path"] = transcript_path
        active_jobs[job_id]["progress"] = 100
        
        logger.info(f"Video processing completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        
        # Update job status to failed
        if job_id in active_jobs:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)
            
        # Clean up temp directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

class WhisperResponse:
    """Mock Whisper API response for when the API is not available"""
    class Segment:
        def __init__(self, start, end, text):
            self.start = start
            self.end = end
            self.text = text
    
    def __init__(self, text):
        self.text = text
        self.segments = []

async def transcribe_with_whisper(audio_file_path):
    """Transcribe audio using OpenAI Whisper API or fallback to local transcription"""
    if not OPENAI_API_KEY:
        logger.warning("No OpenAI API key provided. Using speech segment detection instead.")
        raise Exception("No OpenAI API key provided")
    
    # Debug log the API key (masked)
    if OPENAI_API_KEY:
        masked_key = f"{OPENAI_API_KEY[:7]}...{OPENAI_API_KEY[-4:]}" if len(OPENAI_API_KEY) > 10 else "[INVALID KEY]"
        logger.info(f"Using OpenAI API key: {masked_key}, length: {len(OPENAI_API_KEY)}")
        
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Open the audio file
        with open(audio_file_path, "rb") as audio_file:
            # Call Whisper API for transcription
            response = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language="en",
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"]
            )
            
            return response
    except Exception as e:
        logger.error(f"Error transcribing with Whisper API: {str(e)}")
        raise

async def process_youtube_video(job_id: str, youtube_url: str):
    """Real YouTube video processing function using yt-dlp and OpenAI Whisper API"""
    temp_dir = None
    try:
        logger.info(f"Starting YouTube video analysis for job {job_id}")
        
        # Create a temporary directory for processing files
        temp_dir = tempfile.mkdtemp(dir=TEMP_DIR)
        active_jobs[job_id]["progress"] = 5
        
        # Extract video info first
        logger.info(f"Extracting info from YouTube URL: {youtube_url}")
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'format': 'bestaudio/best',
            'extract_flat': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            video_info = ydl.extract_info(youtube_url, download=False)
        
        # Update job with video metadata
        active_jobs[job_id]["video_title"] = video_info.get('title', 'Unknown Title')
        active_jobs[job_id]["video_channel"] = video_info.get('uploader', 'Unknown Channel')
        active_jobs[job_id]["video_duration"] = video_info.get('duration', 0)
        active_jobs[job_id]["progress"] = 15
        
        # Set up yt-dlp options for audio download
        # Using mp3 since it's more compatible with Whisper API
        audio_file = os.path.join(temp_dir, f"{job_id}_audio.mp3")
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': os.path.join(temp_dir, f"{job_id}_audio"),
            'quiet': True,
            'no_warnings': True,
        }
        
        # Download audio
        logger.info(f"Downloading audio from YouTube URL: {youtube_url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        active_jobs[job_id]["progress"] = 40
        
        # Find the downloaded audio file (may have a different extension)
        audio_files = [f for f in os.listdir(temp_dir) if f.startswith(f"{job_id}_audio")]
        if not audio_files:
            raise Exception("Audio download failed, no audio file found")
            
        downloaded_audio_file = os.path.join(temp_dir, audio_files[0])
        logger.info(f"Audio downloaded to: {downloaded_audio_file}")
        active_jobs[job_id]["progress"] = 50
        
        # Transcribe the audio using OpenAI Whisper API
        logger.info(f"Transcribing audio with Whisper API")
        active_jobs[job_id]["progress"] = 60
        
        try:
            # Call Whisper API for transcription
            transcript_data = await transcribe_with_whisper(downloaded_audio_file)
            active_jobs[job_id]["progress"] = 90
            
            # Format the transcript with timestamps from the Whisper API response
            transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
            
            with open(transcript_path, "w") as f:
                f.write(f"YouTube Video: {youtube_url}\n")
                f.write(f"Title: {active_jobs[job_id]['video_title']}\n")
                f.write(f"Channel: {active_jobs[job_id]['video_channel']}\n")
                f.write(f"Duration: {active_jobs[job_id]['video_duration']} seconds\n\n")
                f.write("==== WHISPER TRANSCRIPTION ====\n\n")
                
                # Write the full transcript
                f.write(transcript_data.text + "\n\n")
                
                # Write segments with timestamps
                f.write("==== TRANSCRIPT WITH TIMESTAMPS ====\n\n")
                
                for segment in transcript_data.segments:
                    start_time = format_timestamp(segment.start)
                    end_time = format_timestamp(segment.end)
                    text = segment.text.strip()
                    f.write(f"[{start_time} - {end_time}] {text}\n")
                
        except Exception as e:
            logger.error(f"Error with Whisper API, falling back to simple speech detection: {str(e)}")
            active_jobs[job_id]["progress"] = 70
            
            # Fallback to speech segment detection
            cmd = [
                'ffmpeg', '-i', downloaded_audio_file, 
                '-af', 'silencedetect=n=-30dB:d=0.5', 
                '-f', 'null', '-'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = result.stderr
            
            # Parse the silence detection output
            silence_starts = re.findall(r'silence_start: (\d+\.\d+)', output)
            silence_ends = re.findall(r'silence_end: (\d+\.\d+)', output)
            
            # Create transcript with detected speech segments
            transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
            with open(transcript_path, "w") as f:
                f.write(f"YouTube Video: {youtube_url}\n")
                f.write(f"Title: {active_jobs[job_id]['video_title']}\n")
                f.write(f"Channel: {active_jobs[job_id]['video_channel']}\n")
                f.write(f"Duration: {active_jobs[job_id]['video_duration']} seconds\n\n")
                f.write("==== AUDIO SEGMENTS ====\n\n")
                
                # If we have silence markers, use them to identify speech segments
                if silence_starts and silence_ends:
                    # Ensure we start from the beginning
                    if float(silence_starts[0]) > 0:
                        f.write(f"[00:00:00 - {format_timestamp(float(silence_starts[0]))}] Speech segment\n")
                    
                    # Process middle segments
                    for i in range(min(len(silence_ends), len(silence_starts))):
                        end_time = float(silence_ends[i])
                        
                        if i < len(silence_starts):
                            start_time = float(silence_starts[i])
                            f.write(f"[{format_timestamp(end_time)} - {format_timestamp(start_time)}] Speech segment\n")
                else:
                    f.write("No clear speech segments detected. The audio may be continuous or very quiet.\n")
                    
                f.write("\n==== NOTE ====\n")
                f.write("Failed to use Whisper API for transcription. Falling back to speech detection.\n")
                f.write(f"Error: {str(e)}\n")
        
        active_jobs[job_id]["progress"] = 95
        
        # Clean up temp files but keep the transcript
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        # Update job status
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["end_time"] = datetime.now().isoformat()
        active_jobs[job_id]["transcript_path"] = transcript_path
        active_jobs[job_id]["progress"] = 100
        
        logger.info(f"YouTube video analysis completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing YouTube video: {str(e)}")
        
        # Update job status to failed
        if job_id in active_jobs:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)
        
        # Clean up temp directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        active_jobs[job_id]["progress"] = 95
        
        # Clean up temp files but keep the transcript
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        
        # Update job status
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["end_time"] = datetime.now().isoformat()
        active_jobs[job_id]["transcript_path"] = transcript_path
        active_jobs[job_id]["progress"] = 100
        
        logger.info(f"YouTube video analysis completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing YouTube video: {str(e)}")
        
        # Update job status to failed
        if job_id in active_jobs:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)
        
        # Clean up temp directory if it exists
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@app.get("/jobs")
async def get_jobs():
    """Get all jobs"""
    return {"jobs": list(active_jobs.values())}

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job by ID"""
    if job_id not in active_jobs:
        return JSONResponse(
            status_code=404,
            content={"message": f"Job {job_id} not found"}
        )
    
    return active_jobs[job_id]

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    """Get transcript for a job"""
    if job_id not in active_jobs:
        return JSONResponse(
            status_code=404,
            content={"message": f"Job {job_id} not found"}
        )
    
    job = active_jobs[job_id]
    
    if job["status"] != "completed":
        return JSONResponse(
            status_code=400,
            content={"message": f"Transcript not available, job status: {job['status']}"}
        )
    
    try:
        with open(job["transcript_path"], "r") as f:
            transcript = f.read()
        
        return {"job_id": job_id, "transcript": transcript}
    except Exception as e:
        logger.error(f"Error reading transcript: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error reading transcript: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)