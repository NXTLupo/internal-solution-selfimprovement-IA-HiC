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
from youtube_transcript_api import YouTubeTranscriptApi

# Pydantic model for YouTube URL
class YouTubeAnalysisRequest(BaseModel):
    url: str

# OpenAI API key (should be set as environment variable in production)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# 2026-06-01 — Gemini multimodal transcription fallback. Used when OpenAI
# Whisper returns 429 insufficient_quota (billing exhausted) so uploads still
# get a real transcript instead of "Speech segment" placeholders.
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_TRANSCRIBE_MODEL = os.environ.get('GEMINI_TRANSCRIBE_MODEL', 'gemini-3.5-flash')

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


# 2026-05-22 — Structured JSON export.
# Earlier transcripts were persisted only as formatted .txt files, so the
# /transcript/{job_id} endpoint flattened the entire transcription (video
# metadata, full text, per-segment timings) into a single "transcript" string
# field. The JSON download was effectively just that string wrapped in JSON —
# useless to any downstream parser. We now persist a structured sidecar
# `{job_id}_transcript.json` alongside the .txt at every transcript-write
# site, and /transcript/{job_id} merges it into the response. The .txt file
# is preserved for any existing readers.
def _whisper_segments_to_list(segments, offset_seconds: float = 0.0) -> list:
    """Normalize Whisper-style segment objects to plain dicts. Accepts both
    OpenAI SDK Segment instances and our WhisperResponse.Segment stitched
    placeholders — both expose .start/.end/.text."""
    out = []
    for seg in segments or []:
        start = float(getattr(seg, 'start', 0) or 0) + offset_seconds
        end = float(getattr(seg, 'end', 0) or 0) + offset_seconds
        text = (getattr(seg, 'text', '') or '').strip()
        if not text:
            continue
        out.append({"start": round(start, 3), "end": round(end, 3), "text": text})
    return out


def _save_transcript_sidecar(job_id: str, source: dict, transcription: dict) -> str:
    """Persist a structured transcript JSON next to the .txt file.
    Returns the absolute path to the written sidecar."""
    payload = {
        "job_id": job_id,
        "format_version": "1.0",
        "completed_at": datetime.now().isoformat(),
        "source": source,
        "transcription": transcription,
    }
    path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return path

async def process_video(job_id: str, file_path: str):
    """Real video processing function using FFmpeg and Whisper API"""
    temp_dir = None
    try:
        logger.info(f"Starting video processing for job {job_id}")
        
        # Create a temporary directory for processing files
        temp_dir = tempfile.mkdtemp(dir=TEMP_DIR)
        active_jobs[job_id]["progress"] = 10
        
        # 2026-05-20 — Switched to Whisper-optimal extraction (16 kHz mono
        # 64 kbps). Was 44.1 kHz stereo VBR q=4 (~165 kbps); produced files
        # that exceeded Whisper's 25 MB cap for anything over ~20 min and
        # silently fell back to "Speech segment" placeholders. Whisper
        # internally downsamples to 16 kHz anyway, so this is lossless from
        # the model's perspective and ~5x smaller on disk.
        audio_file = os.path.join(temp_dir, f"{job_id}_audio.mp3")
        logger.info(f"Extracting audio from video: {file_path} to {audio_file}")

        cmd = [
            'ffmpeg', '-y', '-i', file_path,
            '-vn', '-acodec', 'libmp3lame',
            '-ar', '16000', '-ac', '1', '-b:a', '64k',
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
            
            _method = getattr(transcript_data, "method", "whisper")
            with open(transcript_path, "w") as f:
                f.write(f"Video File: {os.path.basename(file_path)}\n\n")
                f.write(f"==== {'GEMINI' if _method == 'gemini' else 'WHISPER'} TRANSCRIPTION ====\n\n")

                # Write the full transcript
                f.write(transcript_data.text + "\n\n")

                # Write segments with timestamps
                f.write("==== TRANSCRIPT WITH TIMESTAMPS ====\n\n")

                for segment in transcript_data.segments:
                    start_time = format_timestamp(segment.start)
                    end_time = format_timestamp(segment.end)
                    text = segment.text.strip()
                    f.write(f"[{start_time} - {end_time}] {text}\n")

            sidecar_path = _save_transcript_sidecar(
                job_id,
                source={
                    "type": "upload",
                    "filename": os.path.basename(file_path),
                },
                transcription={
                    "method": _method,
                    "language": getattr(transcript_data, "language", "en"),
                    "full_text": (transcript_data.text or "").strip(),
                    "segments": _whisper_segments_to_list(getattr(transcript_data, "segments", []) or []),
                },
            )
            active_jobs[job_id]["transcript_json_path"] = sidecar_path

        except Exception as e:
            logger.error(f"Transcription failed on BOTH Whisper and Gemini, falling back to simple speech detection: {str(e)}")
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

            fallback_segments = []
            if silence_starts and silence_ends:
                if float(silence_starts[0]) > 0:
                    fallback_segments.append({
                        "start": 0.0,
                        "end": round(float(silence_starts[0]), 3),
                        "text": "Speech segment",
                    })
                for i in range(min(len(silence_ends), len(silence_starts))):
                    fallback_segments.append({
                        "start": round(float(silence_ends[i]), 3),
                        "end": round(float(silence_starts[i]), 3),
                        "text": "Speech segment",
                    })

            sidecar_path = _save_transcript_sidecar(
                job_id,
                source={
                    "type": "upload",
                    "filename": os.path.basename(file_path),
                },
                transcription={
                    "method": "silence_detection",
                    "language": None,
                    "full_text": "",
                    "segments": fallback_segments,
                    "fallback_reason": str(e),
                },
            )
            active_jobs[job_id]["transcript_json_path"] = sidecar_path

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

# 2026-05-20 — Whisper API has a hard 25 MB upload limit. Any audio file
# larger than that returns 413 and the pipeline silently falls back to
# silence-detection ("Speech segment" placeholders for every timestamp).
# The fix is two-layered:
#   1. _whisper_optimize_audio() recompresses to 16 kHz mono 64 kbps MP3,
#      which is Whisper's recommended preprocessing and ~5x smaller than
#      the previous 44.1 kHz stereo 165 kbps output. Most videos under
#      ~2 hours now fit under 25 MB in a single shot.
#   2. _split_audio_for_whisper() chunks audio that's STILL too big into
#      ~10-minute segments via FFmpeg and transcribes each. Segment
#      timestamps are offset by the chunk's start time so the stitched
#      transcript has a continuous, monotonic timeline.
WHISPER_MAX_BYTES = 24 * 1024 * 1024   # 24 MB — 1 MB safety margin under 25 MB API cap
WHISPER_CHUNK_SECONDS = 600            # 10-min chunks; ~5 MB each at 64kbps mono


def _whisper_optimize_audio(input_path: str, output_path: str) -> None:
    """Recompress audio to Whisper-optimal format (16 kHz mono 64 kbps MP3).
    Raises CalledProcessError on FFmpeg failure."""
    cmd = [
        'ffmpeg', '-y', '-i', input_path,
        '-vn',                  # drop any video
        '-ac', '1',             # mono
        '-ar', '16000',         # 16 kHz (Whisper internal sample rate)
        '-b:a', '64k',          # 64 kbps — Whisper-recommended
        '-acodec', 'libmp3lame',
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _audio_duration_seconds(path: str) -> float:
    """Read media duration in seconds via ffprobe. Returns 0 on failure
    so the chunker can decide based on file size alone."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', path],
            capture_output=True, text=True, check=True,
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return 0.0


def _split_audio_for_whisper(audio_path: str, chunk_dir: str, chunk_seconds: int = WHISPER_CHUNK_SECONDS) -> list:
    """Split audio into fixed-duration chunks via FFmpeg's segment muxer.
    Returns list of (chunk_path, start_offset_seconds) tuples in time order."""
    os.makedirs(chunk_dir, exist_ok=True)
    pattern = os.path.join(chunk_dir, "chunk_%03d.mp3")
    cmd = [
        'ffmpeg', '-y', '-i', audio_path,
        '-f', 'segment',
        '-segment_time', str(chunk_seconds),
        '-c', 'copy',                  # no re-encode — splits are byte-fast
        '-reset_timestamps', '1',
        pattern,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    chunks = sorted(f for f in os.listdir(chunk_dir) if f.startswith("chunk_") and f.endswith(".mp3"))
    return [(os.path.join(chunk_dir, name), idx * chunk_seconds) for idx, name in enumerate(chunks)]


def _whisper_single_call(client, audio_file_path: str):
    """Single Whisper API call. Caller owns chunking + error handling."""
    with open(audio_file_path, "rb") as audio_file:
        return client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en",
            response_format="verbose_json",
            timestamp_granularities=["segment", "word"],
        )


async def transcribe_with_gemini(audio_file_path):
    """Fallback transcription via Gemini multimodal (google-genai File API).
    Invoked when OpenAI Whisper is unavailable (e.g. 429 insufficient_quota).
    Returns a WhisperResponse-shaped object so the rest of the pipeline is
    unchanged. Raises on its own failure so the caller can degrade further."""
    if not GEMINI_API_KEY:
        raise Exception("No GEMINI_API_KEY configured for Gemini transcription fallback")
    from google import genai   # local import: only needed on the fallback path

    client = genai.Client(api_key=GEMINI_API_KEY)
    logger.info(
        f"Gemini transcription fallback via {GEMINI_TRANSCRIBE_MODEL}: "
        f"uploading {os.path.basename(audio_file_path)} "
        f"({os.path.getsize(audio_file_path):,} bytes)"
    )
    uploaded = client.files.upload(file=audio_file_path)

    # Audio files are usually ACTIVE immediately; poll briefly if still PROCESSING.
    for _ in range(30):
        state = getattr(getattr(uploaded, 'state', None), 'name', None) or getattr(uploaded, 'state', None)
        if state in (None, 'ACTIVE'):
            break
        if state == 'FAILED':
            raise Exception("Gemini File API reported FAILED processing the audio")
        time.sleep(1)
        uploaded = client.files.get(name=uploaded.name)

    prompt = (
        "Transcribe this audio VERBATIM. Return ONLY raw JSON (no markdown, no code fences, "
        "no commentary) with EXACTLY this shape: "
        '{"language":"<iso code>","segments":[{"start":<seconds number>,"end":<seconds number>,'
        '"text":"<verbatim spoken text>"}]}. '
        "Break the transcript into natural sentence/pause segments in time order. "
        "Timestamps are seconds from the start of the audio; estimate if uncertain. "
        "Transcribe every spoken word; do not summarize or paraphrase."
    )
    response = client.models.generate_content(
        model=GEMINI_TRANSCRIBE_MODEL,
        contents=[prompt, uploaded],
    )
    raw = (getattr(response, 'text', '') or '').strip()
    # Strip accidental ```json fences.
    if raw.startswith('```'):
        raw = re.sub(r'^```[a-zA-Z]*\n?', '', raw)
        raw = re.sub(r'\n?```$', '', raw).strip()

    segments = []
    language = 'en'
    text = raw
    try:
        data = json.loads(raw)
        language = data.get('language') or 'en'
        parts = []
        for s in (data.get('segments') or []):
            try:
                st = float(s.get('start', 0) or 0)
                en = float(s.get('end', st) or st)
            except (TypeError, ValueError):
                st, en = 0.0, 0.0
            tx = (s.get('text') or '').strip()
            if not tx:
                continue
            segments.append(WhisperResponse.Segment(start=st, end=en, text=tx))
            parts.append(tx)
        text = ' '.join(parts) if parts else raw
    except (json.JSONDecodeError, ValueError) as pe:
        # Model returned prose instead of JSON — still a real transcript. Keep
        # it as one full-length segment rather than discarding it.
        logger.warning(f"Gemini transcription was not JSON; using raw text as one segment ({pe})")
        dur = _audio_duration_seconds(audio_file_path)
        text = raw
        segments = [WhisperResponse.Segment(start=0.0, end=dur or 0.0, text=raw)] if raw else []

    if not segments:
        raise Exception("Gemini transcription returned empty text")

    result = WhisperResponse(text)
    result.segments = segments
    result.language = language
    result.method = 'gemini'

    # Best-effort cleanup of the uploaded file (don't fail the job if it errors).
    try:
        client.files.delete(name=uploaded.name)
    except Exception:
        pass

    logger.info(f"Gemini transcription succeeded: {len(segments)} segments, {len(text):,} chars")
    return result


async def transcribe_with_whisper(audio_file_path):
    """Public transcription entry point. Tries OpenAI Whisper first; on ANY
    failure (most commonly 429 insufficient_quota when OpenAI billing is dry)
    falls back to Gemini multimodal transcription. Raises only if BOTH fail,
    at which point the caller degrades to silence-detection segments."""
    try:
        return await _transcribe_with_whisper_only(audio_file_path)
    except Exception as whisper_err:
        logger.error(f"Whisper unavailable ({whisper_err}); attempting Gemini transcription fallback")
        return await transcribe_with_gemini(audio_file_path)


async def _transcribe_with_whisper_only(audio_file_path):
    """Transcribe audio via OpenAI Whisper. Handles files >25 MB by:
      (a) recompressing to Whisper-optimal 16kHz mono 64 kbps MP3
      (b) if still too big, chunking into 10-min segments and stitching results."""
    if not OPENAI_API_KEY:
        logger.warning("No OpenAI API key provided. Using speech segment detection instead.")
        raise Exception("No OpenAI API key provided")

    masked_key = f"{OPENAI_API_KEY[:7]}...{OPENAI_API_KEY[-4:]}" if len(OPENAI_API_KEY) > 10 else "[INVALID KEY]"
    logger.info(f"Using OpenAI API key: {masked_key}, length: {len(OPENAI_API_KEY)}")

    client = OpenAI(api_key=OPENAI_API_KEY)

    # Step 1: ensure audio is Whisper-optimal. If recompression fails, fall
    # back to the original file (smaller-is-better, but original > nothing).
    work_dir = tempfile.mkdtemp(dir=TEMP_DIR, prefix="whisper_")
    try:
        optimized_path = os.path.join(work_dir, "optimized.mp3")
        try:
            _whisper_optimize_audio(audio_file_path, optimized_path)
            active_path = optimized_path
            logger.info(
                f"Whisper preprocess: {os.path.getsize(audio_file_path):,} → "
                f"{os.path.getsize(optimized_path):,} bytes (16kHz mono 64kbps)"
            )
        except subprocess.CalledProcessError as e:
            logger.warning(f"Whisper preprocess failed; using original audio. {e.stderr[:200] if e.stderr else ''}")
            active_path = audio_file_path

        # Step 2: single shot if under 24 MB.
        size_bytes = os.path.getsize(active_path)
        if size_bytes <= WHISPER_MAX_BYTES:
            logger.info(f"Whisper single-shot transcription ({size_bytes:,} bytes)")
            try:
                return _whisper_single_call(client, active_path)
            except Exception as e:
                logger.error(f"Whisper single-shot failed: {e}")
                raise

        # Step 3: chunk + stitch.
        logger.info(f"Audio is {size_bytes:,} bytes (>24 MB) — chunking into {WHISPER_CHUNK_SECONDS}s segments")
        chunk_dir = os.path.join(work_dir, "chunks")
        chunks = _split_audio_for_whisper(active_path, chunk_dir, WHISPER_CHUNK_SECONDS)
        if not chunks:
            raise Exception("Audio chunking produced zero chunks")

        full_text_parts: list = []
        all_segments: list = []
        for chunk_path, offset_s in chunks:
            chunk_size = os.path.getsize(chunk_path)
            logger.info(f"Whisper chunk @+{offset_s}s ({chunk_size:,} bytes): {os.path.basename(chunk_path)}")
            chunk_resp = _whisper_single_call(client, chunk_path)
            if getattr(chunk_resp, 'text', None):
                full_text_parts.append(chunk_resp.text)
            chunk_segments = getattr(chunk_resp, 'segments', None) or []
            for seg in chunk_segments:
                # Offset timestamps so the stitched transcript has a continuous timeline.
                seg_start = getattr(seg, 'start', 0) or 0
                seg_end = getattr(seg, 'end', 0) or 0
                seg_text = getattr(seg, 'text', '') or ''
                all_segments.append(WhisperResponse.Segment(
                    start=seg_start + offset_s,
                    end=seg_end + offset_s,
                    text=seg_text,
                ))

        stitched = WhisperResponse('\n'.join(full_text_parts))
        stitched.segments = all_segments
        logger.info(f"Whisper stitched: {len(chunks)} chunks → {len(all_segments)} segments, {len(stitched.text):,} chars")
        return stitched
    finally:
        try:
            shutil.rmtree(work_dir)
        except Exception:
            pass

async def process_youtube_video(job_id: str, youtube_url: str):
    """Real YouTube video processing function using yt-dlp and OpenAI Whisper API"""
    temp_dir = None
    try:
        logger.info(f"Starting YouTube video analysis for job {job_id}")
        
        # Extract video ID from URL
        video_id = None
        if "youtube.com/watch?v=" in youtube_url:
            video_id = youtube_url.split("youtube.com/watch?v=")[1].split("&")[0]
        elif "youtu.be/" in youtube_url:
            video_id = youtube_url.split("youtu.be/")[1].split("?")[0]
        
        if not video_id:
            raise Exception("Could not extract video ID from URL")
        
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
        
        # Try to get YouTube transcript first
        transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
        try:
            logger.info(f"Attempting to fetch YouTube transcript for video ID: {video_id}")
            transcript_api = YouTubeTranscriptApi()
            transcript_list = transcript_api.fetch(video_id)
            
            # Format and save the transcript
            structured_segments = []
            full_text_parts = []
            for entry in transcript_list:
                entry_text = (entry.text or "").replace('\n', ' ').strip()
                if not entry_text:
                    continue
                start = float(entry.start or 0)
                duration = float(getattr(entry, 'duration', 0) or 0)
                full_text_parts.append(entry_text)
                structured_segments.append({
                    "start": round(start, 3),
                    "end": round(start + duration, 3),
                    "text": entry_text,
                })
            full_text = " ".join(full_text_parts)

            with open(transcript_path, "w") as f:
                f.write(f"YouTube Video: {youtube_url}\n")
                f.write(f"Title: {active_jobs[job_id]['video_title']}\n")
                f.write(f"Channel: {active_jobs[job_id]['video_channel']}\n")
                f.write(f"Duration: {active_jobs[job_id]['video_duration']} seconds\n\n")
                f.write("==== YOUTUBE TRANSCRIPT (AUTO-GENERATED) ====\n\n")
                f.write(full_text + "\n\n")
                f.write("==== TRANSCRIPT WITH TIMESTAMPS ====\n\n")
                for seg in structured_segments:
                    f.write(f"[{format_timestamp(seg['start'])} - {format_timestamp(seg['end'])}] {seg['text']}\n")

            sidecar_path = _save_transcript_sidecar(
                job_id,
                source={
                    "type": "youtube",
                    "url": youtube_url,
                    "video_id": video_id,
                    "title": active_jobs[job_id]["video_title"],
                    "channel": active_jobs[job_id]["video_channel"],
                    "duration_seconds": active_jobs[job_id]["video_duration"],
                },
                transcription={
                    "method": "youtube_captions",
                    "language": getattr(transcript_list, "language_code", None),
                    "full_text": full_text,
                    "segments": structured_segments,
                },
            )
            active_jobs[job_id]["transcript_json_path"] = sidecar_path

            logger.info("Successfully fetched YouTube transcript")
            active_jobs[job_id]["progress"] = 90
            
            # Clean up temp directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            
            # Update job status
            active_jobs[job_id]["status"] = "completed"
            active_jobs[job_id]["end_time"] = datetime.now().isoformat()
            active_jobs[job_id]["transcript_path"] = transcript_path
            active_jobs[job_id]["progress"] = 100
            
            logger.info(f"YouTube video analysis completed for job {job_id}")
            return  # Exit early if transcript was successful
            
        except Exception as transcript_error:
            logger.warning(f"Could not fetch YouTube transcript: {str(transcript_error)}. Attempting to download and transcribe...")
        
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
            
            _method = getattr(transcript_data, "method", "whisper")
            with open(transcript_path, "w") as f:
                f.write(f"YouTube Video: {youtube_url}\n")
                f.write(f"Title: {active_jobs[job_id]['video_title']}\n")
                f.write(f"Channel: {active_jobs[job_id]['video_channel']}\n")
                f.write(f"Duration: {active_jobs[job_id]['video_duration']} seconds\n\n")
                f.write(f"==== {'GEMINI' if _method == 'gemini' else 'WHISPER'} TRANSCRIPTION ====\n\n")

                # Write the full transcript
                f.write(transcript_data.text + "\n\n")

                # Write segments with timestamps
                f.write("==== TRANSCRIPT WITH TIMESTAMPS ====\n\n")

                for segment in transcript_data.segments:
                    start_time = format_timestamp(segment.start)
                    end_time = format_timestamp(segment.end)
                    text = segment.text.strip()
                    f.write(f"[{start_time} - {end_time}] {text}\n")

            sidecar_path = _save_transcript_sidecar(
                job_id,
                source={
                    "type": "youtube",
                    "url": youtube_url,
                    "video_id": video_id,
                    "title": active_jobs[job_id]["video_title"],
                    "channel": active_jobs[job_id]["video_channel"],
                    "duration_seconds": active_jobs[job_id]["video_duration"],
                },
                transcription={
                    "method": _method,
                    "language": getattr(transcript_data, "language", "en"),
                    "full_text": (transcript_data.text or "").strip(),
                    "segments": _whisper_segments_to_list(getattr(transcript_data, "segments", []) or []),
                },
            )
            active_jobs[job_id]["transcript_json_path"] = sidecar_path

        except Exception as e:
            logger.error(f"Transcription failed on BOTH Whisper and Gemini, falling back to simple speech detection: {str(e)}")
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

            fallback_segments = []
            if silence_starts and silence_ends:
                if float(silence_starts[0]) > 0:
                    fallback_segments.append({
                        "start": 0.0,
                        "end": round(float(silence_starts[0]), 3),
                        "text": "Speech segment",
                    })
                for i in range(min(len(silence_ends), len(silence_starts))):
                    fallback_segments.append({
                        "start": round(float(silence_ends[i]), 3),
                        "end": round(float(silence_starts[i]), 3),
                        "text": "Speech segment",
                    })

            sidecar_path = _save_transcript_sidecar(
                job_id,
                source={
                    "type": "youtube",
                    "url": youtube_url,
                    "video_id": video_id,
                    "title": active_jobs[job_id]["video_title"],
                    "channel": active_jobs[job_id]["video_channel"],
                    "duration_seconds": active_jobs[job_id]["video_duration"],
                },
                transcription={
                    "method": "silence_detection",
                    "language": None,
                    "full_text": "",
                    "segments": fallback_segments,
                    "fallback_reason": str(e),
                },
            )
            active_jobs[job_id]["transcript_json_path"] = sidecar_path
        
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
    
    # Check if transcript_path exists in the job dictionary
    if "transcript_path" not in job:
        return JSONResponse(
            status_code=500,
            content={"message": "Transcript path not found in job data"}
        )
    
    try:
        with open(job["transcript_path"], "r", encoding="utf-8") as f:
            transcript = f.read()

        # Merge in the structured sidecar when present. Older jobs (pre-2026-05-22)
        # won't have one — they still return the legacy text-only shape.
        response = {"job_id": job_id, "transcript": transcript}
        sidecar_path = job.get("transcript_json_path") or os.path.join(
            TRANSCRIPT_DIR, f"{job_id}_transcript.json"
        )
        if os.path.exists(sidecar_path):
            try:
                with open(sidecar_path, "r", encoding="utf-8") as f:
                    sidecar = json.load(f)
                response["source"] = sidecar.get("source")
                response["transcription"] = sidecar.get("transcription")
                response["completed_at"] = sidecar.get("completed_at")
                response["format_version"] = sidecar.get("format_version", "1.0")
            except Exception as sidecar_err:
                logger.warning(f"Could not read transcript sidecar for {job_id}: {sidecar_err}")

        return response
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