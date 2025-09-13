# Video Analyzer Backend Implementation

This document outlines the implementation details for the Video Analyzer backend, including API endpoints, data models, processing workflows, and integration points.

## Backend Architecture

The Video Analyzer backend consists of two main components:

1. **Video Analyzer Core Service** - Handles video processing, transcription, and analysis
2. **Video MCP Service** - Exposes standardized API for agent integration

```
┌───────────────────────────────────────┐
│                                       │
│            Launchpad                  │
│            Frontend                   │
│                                       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│                                       │
│          WebSocket Proxy              │
│                                       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│                                       │
│          Video MCP Service            │
│                                       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│                                       │
│     Video Analyzer Core Service       │
│                                       │
│  ┌─────────────┐    ┌─────────────┐   │
│  │             │    │             │   │
│  │Transcription│    │  Analysis   │   │
│  │   Engine    │    │   Engine    │   │
│  │             │    │             │   │
│  └─────────────┘    └─────────────┘   │
│                                       │
└───────────────────────────────────────┘
```

## Core Technologies

- **FastAPI** - High-performance web framework for APIs
- **Pydantic** - Data validation and settings management
- **Whisper** - Speech-to-text model for transcription
- **Claude 3.7** - LLM for analysis tasks
- **yt-dlp** - YouTube video downloading
- **FFmpeg** - Audio/video processing
- **asyncio** - Asynchronous task processing
- **WebSockets** - Real-time progress updates

## Data Models

Define the Pydantic models for data validation and API interaction:

```python
# models.py
from enum import Enum
from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field, HttpUrl, validator
import uuid

class JobStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AnalysisType(str, Enum):
    SUMMARY = "summary"
    THEMES = "themes"
    INSIGHTS = "insights"
    KEYWORDS = "keywords"
    ALL = "all"

class TranscriptSegment(BaseModel):
    text: str
    start: float
    end: float
    words: Optional[List[Dict[str, Any]]] = None

class TranscriptionResult(BaseModel):
    segments: List[TranscriptSegment]
    text: str
    source: str = "whisper"  # "whisper" or "youtube"
    language: Optional[str] = None

class ThemeEvidence(BaseModel):
    text: str
    start: Optional[float] = None
    end: Optional[float] = None

class Theme(BaseModel):
    title: str
    description: str
    evidence: List[ThemeEvidence]

class Insight(BaseModel):
    title: str
    description: str
    evidence: str

class AnalysisResult(BaseModel):
    summary: str
    themes: List[Theme]
    insights: List[Insight]
    keywords: List[str]

class VideoInfo(BaseModel):
    title: Optional[str] = None
    duration: Optional[float] = None
    channel: Optional[str] = None
    upload_date: Optional[str] = None
    thumbnail_url: Optional[str] = None

class JobProgress(BaseModel):
    stage: JobStatus
    progress: float = 0.0  # 0.0 to 1.0
    message: Optional[str] = None

class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus = JobStatus.PENDING
    url: Optional[str] = None
    file_id: Optional[str] = None
    created_at: float = Field(default_factory=lambda: time.time())
    updated_at: float = Field(default_factory=lambda: time.time())
    progress: JobProgress = Field(default_factory=lambda: JobProgress(stage=JobStatus.PENDING))
    video_info: Optional[VideoInfo] = None
    transcription: Optional[TranscriptionResult] = None
    analysis: Optional[AnalysisResult] = None
    error: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "status": "completed",
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "created_at": 1618592454.0,
                "updated_at": 1618592500.0,
                "progress": {
                    "stage": "completed",
                    "progress": 1.0,
                    "message": "Analysis complete"
                }
            }
        }

# Request Models
class AnalyzeUrlRequest(BaseModel):
    url: HttpUrl
    analysis_types: List[AnalysisType] = [AnalysisType.ALL]
    language: Optional[str] = None
    
    @validator('url')
    def validate_youtube_url(cls, v):
        # Simple validation to check if it's a YouTube URL
        if 'youtube.com' not in str(v) and 'youtu.be' not in str(v):
            raise ValueError('URL must be a valid YouTube URL')
        return v

class AnalysisRequest(BaseModel):
    job_id: str
    analysis_types: List[AnalysisType] = [AnalysisType.ALL]

# Response Models
class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: JobProgress

class AnalysisResponse(BaseModel):
    job_id: str
    status: JobStatus
    video_info: Optional[VideoInfo] = None
    summary: Optional[str] = None
    themes: Optional[List[Theme]] = None
    insights: Optional[List[Insight]] = None
    keywords: Optional[List[str]] = None
```

## Database / Storage

For simplicity, use in-memory storage with an option to persist to disk:

```python
# storage.py
import json
import os
from typing import Dict, Optional, List
import aiofiles
from models import Job, JobStatus

class JobStorage:
    def __init__(self, storage_dir: str = "./storage"):
        self.jobs: Dict[str, Job] = {}
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        
    async def save_job(self, job: Job) -> None:
        self.jobs[job.id] = job
        # Optionally persist to disk
        await self._save_to_disk(job)
        
    async def get_job(self, job_id: str) -> Optional[Job]:
        if job_id in self.jobs:
            return self.jobs[job_id]
            
        # Try to load from disk if not in memory
        job = await self._load_from_disk(job_id)
        if job:
            self.jobs[job_id] = job
        return job
    
    async def update_job(self, job_id: str, **updates) -> Optional[Job]:
        job = await self.get_job(job_id)
        if not job:
            return None
            
        for key, value in updates.items():
            setattr(job, key, value)
        
        job.updated_at = time.time()
        await self.save_job(job)
        return job
    
    async def list_jobs(self, limit: int = 100, offset: int = 0) -> List[Job]:
        jobs = list(self.jobs.values())
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs[offset:offset+limit]
    
    async def _save_to_disk(self, job: Job) -> None:
        path = os.path.join(self.storage_dir, f"{job.id}.json")
        async with aiofiles.open(path, "w") as f:
            await f.write(job.json())
    
    async def _load_from_disk(self, job_id: str) -> Optional[Job]:
        path = os.path.join(self.storage_dir, f"{job_id}.json")
        if not os.path.exists(path):
            return None
            
        try:
            async with aiofiles.open(path, "r") as f:
                content = await f.read()
                return Job.parse_raw(content)
        except Exception:
            return None
```

## API Endpoints - Video Analyzer Core Service

```python
# app.py
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, WebSocket, Query
from fastapi.responses import FileResponse, StreamingResponse
import os
import time
import asyncio
from typing import Dict, List, Optional, Any

from models import (
    Job, JobStatus, JobProgress, AnalyzeUrlRequest, AnalysisRequest, 
    JobResponse, AnalysisResponse, AnalysisType
)
from storage import JobStorage
from transcription.youtube_fetcher import fetch_video_info, download_youtube_video
from transcription.whisper_transcriber import transcribe_audio
from analysis.analyzer import analyze_transcript

app = FastAPI(title="Video Analyzer API")
job_storage = JobStorage()

# Active WebSocket connections for progress updates
active_connections: Dict[str, List[WebSocket]] = {}

# Helper functions
async def send_progress_update(job_id: str, progress: JobProgress):
    """Send progress updates to all connected clients for this job."""
    if job_id in active_connections:
        for connection in active_connections[job_id]:
            try:
                await connection.send_json(progress.dict())
            except Exception:
                # Connection might be closed
                pass

async def process_youtube_video(job_id: str, url: str, analysis_types: List[AnalysisType], language: Optional[str] = None):
    """Background task to process a YouTube video."""
    try:
        # Update job status to downloading
        job = await job_storage.update_job(
            job_id,
            status=JobStatus.DOWNLOADING,
            progress=JobProgress(stage=JobStatus.DOWNLOADING, progress=0.0, message="Fetching video info...")
        )
        
        # Fetch video info
        video_info = await fetch_video_info(url)
        job = await job_storage.update_job(job_id, video_info=video_info)
        
        # Update progress
        await job_storage.update_job(
            job_id,
            progress=JobProgress(stage=JobStatus.DOWNLOADING, progress=0.2, message="Downloading video...")
        )
        await send_progress_update(job_id, job.progress)
        
        # Download video
        audio_path = await download_youtube_video(url, f"./temp/{job_id}")
        
        # Update job status to transcribing
        await job_storage.update_job(
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=JobProgress(stage=JobStatus.TRANSCRIBING, progress=0.4, message="Transcribing audio...")
        )
        await send_progress_update(job_id, job.progress)
        
        # Transcribe audio
        transcription = await transcribe_audio(audio_path, language)
        
        # Save transcript files
        transcript_dir = f"./transcripts/{job_id}"
        os.makedirs(transcript_dir, exist_ok=True)
        
        # Generate different transcript formats
        txt_path = os.path.join(transcript_dir, "transcript.txt")
        with open(txt_path, "w") as f:
            f.write(transcription.text)
            
        srt_path = os.path.join(transcript_dir, "transcript.srt")
        generate_srt(transcription.segments, srt_path)
        
        json_path = os.path.join(transcript_dir, "transcript.json")
        with open(json_path, "w") as f:
            f.write(transcription.json())
        
        # Update job
        await job_storage.update_job(
            job_id,
            transcription=transcription,
            status=JobStatus.ANALYZING,
            progress=JobProgress(stage=JobStatus.ANALYZING, progress=0.6, message="Analyzing transcript...")
        )
        await send_progress_update(job_id, job.progress)
        
        # Analyze transcript
        analysis = await analyze_transcript(transcription, analysis_types, video_info)
        
        # Update job to completed
        await job_storage.update_job(
            job_id,
            analysis=analysis,
            status=JobStatus.COMPLETED,
            progress=JobProgress(stage=JobStatus.COMPLETED, progress=1.0, message="Analysis complete")
        )
        job = await job_storage.get_job(job_id)
        await send_progress_update(job_id, job.progress)
        
        # Clean up temporary files
        os.remove(audio_path)
        
    except Exception as e:
        # Update job status to failed
        await job_storage.update_job(
            job_id,
            status=JobStatus.FAILED,
            error=str(e),
            progress=JobProgress(stage=JobStatus.FAILED, progress=0.0, message=f"Error: {str(e)}")
        )
        job = await job_storage.get_job(job_id)
        await send_progress_update(job_id, job.progress)
        
        # Log the error
        import logging
        logging.error(f"Error processing job {job_id}: {str(e)}", exc_info=True)

# API Endpoints
@app.post("/api/analyze", response_model=JobResponse)
async def analyze_video(request: AnalyzeUrlRequest, background_tasks: BackgroundTasks):
    """
    Analyze a YouTube video from a URL.
    """
    # Create a new job
    job = Job(url=str(request.url))
    await job_storage.save_job(job)
    
    # Start processing in background
    background_tasks.add_task(
        process_youtube_video, 
        job.id, 
        str(request.url), 
        request.analysis_types,
        request.language
    )
    
    return JobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress
    )

@app.post("/api/upload", response_model=JobResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    analysis_types: List[AnalysisType] = Query([AnalysisType.ALL])
):
    """
    Upload and analyze a video file.
    """
    # Create a new job
    job = Job(file_id=file.filename)
    await job_storage.save_job(job)
    
    # Save uploaded file
    upload_dir = f"./uploads/{job.id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    # Write uploaded file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Start processing in background
    background_tasks.add_task(
        process_uploaded_video,
        job.id,
        file_path,
        analysis_types
    )
    
    return JobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress
    )

@app.get("/api/status/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a job.
    """
    job = await job_storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress
    )

@app.get("/api/results/{job_id}", response_model=AnalysisResponse)
async def get_analysis_results(job_id: str):
    """
    Get the analysis results for a job.
    """
    job = await job_storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [JobStatus.COMPLETED, JobStatus.ANALYZING]:
        raise HTTPException(status_code=400, detail=f"Results not available. Current status: {job.status}")
    
    response = AnalysisResponse(
        job_id=job.id,
        status=job.status,
        video_info=job.video_info
    )
    
    if job.analysis:
        response.summary = job.analysis.summary
        response.themes = job.analysis.themes
        response.insights = job.analysis.insights
        response.keywords = job.analysis.keywords
    
    return response

@app.get("/api/transcript/{job_id}")
async def get_transcript(job_id: str, format: str = "txt"):
    """
    Get the transcript for a job in the specified format.
    """
    job = await job_storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.transcription:
        raise HTTPException(status_code=400, detail="Transcript not available")
    
    transcript_dir = f"./transcripts/{job_id}"
    
    if format == "txt":
        file_path = os.path.join(transcript_dir, "transcript.txt")
        return FileResponse(
            file_path, 
            media_type="text/plain", 
            filename=f"{job.video_info.title if job.video_info else 'transcript'}.txt"
        )
    elif format == "srt":
        file_path = os.path.join(transcript_dir, "transcript.srt")
        return FileResponse(
            file_path, 
            media_type="application/x-subrip", 
            filename=f"{job.video_info.title if job.video_info else 'transcript'}.srt"
        )
    elif format == "json":
        file_path = os.path.join(transcript_dir, "transcript.json")
        return FileResponse(
            file_path, 
            media_type="application/json", 
            filename=f"{job.video_info.title if job.video_info else 'transcript'}.json"
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

@app.websocket("/api/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job progress updates.
    """
    await websocket.accept()
    
    # Register connection
    if job_id not in active_connections:
        active_connections[job_id] = []
    active_connections[job_id].append(websocket)
    
    try:
        # Send initial status
        job = await job_storage.get_job(job_id)
        if job:
            await websocket.send_json(job.progress.dict())
        
        # Keep connection open
        while True:
            # Wait for client message (ping)
            await websocket.receive_text()
            
            # Send updated status
            job = await job_storage.get_job(job_id)
            if job:
                await websocket.send_json(job.progress.dict())
            
            # Sleep to prevent tight loop
            await asyncio.sleep(0.1)
    except Exception:
        # Client disconnected
        pass
    finally:
        # Remove connection
        if job_id in active_connections and websocket in active_connections[job_id]:
            active_connections[job_id].remove(websocket)

@app.delete("/api/jobs/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel a job.
    """
    job = await job_storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel job with status: {job.status}")
    
    await job_storage.update_job(
        job_id,
        status=JobStatus.CANCELLED,
        progress=JobProgress(stage=JobStatus.CANCELLED, progress=0.0, message="Job cancelled")
    )
    
    # Notify connected clients
    job = await job_storage.get_job(job_id)
    await send_progress_update(job_id, job.progress)
    
    return {"status": "cancelled"}

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "ok"}
```

## Analysis Engine Implementation

```python
# analysis/analyzer.py
from typing import List, Optional, Dict, Any
import asyncio
import time
from models import (
    TranscriptionResult, VideoInfo, AnalysisResult, 
    Theme, ThemeEvidence, Insight, AnalysisType
)
from utils.prompts import (
    format_summarization_prompt, format_theme_prompt, 
    format_insight_prompt, format_keyword_prompt,
    SUMMARIZATION_SYSTEM_PROMPT, THEME_IDENTIFICATION_SYSTEM_PROMPT,
    INSIGHT_GENERATION_SYSTEM_PROMPT, KEYWORD_EXTRACTION_SYSTEM_PROMPT,
    format_anthropic_messages, chunk_transcript
)
from utils.llm_client import anthropic_completion, local_llm_completion

async def analyze_transcript(
    transcription: TranscriptionResult,
    analysis_types: List[AnalysisType],
    video_info: Optional[VideoInfo] = None,
    use_local_llm: bool = False
) -> AnalysisResult:
    """
    Analyze a transcript using AI models.
    
    Args:
        transcription: The transcription result
        analysis_types: Types of analysis to perform
        video_info: Video metadata if available
        use_local_llm: Whether to use a local LLM instead of API
        
    Returns:
        Analysis results
    """
    # Default to all analysis types if "all" is specified
    if AnalysisType.ALL in analysis_types:
        analysis_types = [AnalysisType.SUMMARY, AnalysisType.THEMES, AnalysisType.INSIGHTS, AnalysisType.KEYWORDS]
    
    # Remove duplicates and "all"
    analysis_types = [t for t in analysis_types if t != AnalysisType.ALL]
    analysis_types = list(set(analysis_types))
    
    # For very long transcripts, use chunking
    full_text = transcription.text
    video_title = video_info.title if video_info else None
    
    # Track results
    results = {}
    
    # Run analysis tasks concurrently
    tasks = []
    
    if AnalysisType.SUMMARY in analysis_types:
        tasks.append(generate_summary(full_text, video_title, use_local_llm))
        
    if AnalysisType.THEMES in analysis_types:
        tasks.append(identify_themes(full_text, video_title, use_local_llm))
        
    if AnalysisType.INSIGHTS in analysis_types:
        tasks.append(generate_insights(full_text, video_title, use_local_llm))
        
    if AnalysisType.KEYWORDS in analysis_types:
        tasks.append(extract_keywords(full_text, video_title, use_local_llm))
    
    # Wait for all tasks to complete
    results_list = await asyncio.gather(*tasks)
    
    # Combine results
    for i, analysis_type in enumerate([t for t in analysis_types if t in [
        AnalysisType.SUMMARY, AnalysisType.THEMES, AnalysisType.INSIGHTS, AnalysisType.KEYWORDS
    ]]):
        results[analysis_type.value] = results_list[i]
    
    # Create analysis result object
    return AnalysisResult(
        summary=results.get(AnalysisType.SUMMARY.value, ""),
        themes=results.get(AnalysisType.THEMES.value, []),
        insights=results.get(AnalysisType.INSIGHTS.value, []),
        keywords=results.get(AnalysisType.KEYWORDS.value, [])
    )

async def generate_summary(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> str:
    """Generate a summary of the transcript."""
    # For long texts, use chunking
    if len(text.split()) > 3000:
        return await generate_summary_for_long_text(text, video_title, use_local_llm)
    
    # Prepare prompt
    prompt = format_summarization_prompt(text, video_title)
    
    # Get completion
    if use_local_llm:
        response = await local_llm_completion(prompt, SUMMARIZATION_SYSTEM_PROMPT)
    else:
        messages = format_anthropic_messages(prompt, SUMMARIZATION_SYSTEM_PROMPT)
        response = await anthropic_completion(messages)
    
    return response.strip()

async def generate_summary_for_long_text(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> str:
    """Generate summary for a long text by chunking."""
    # Split into chunks
    chunks = chunk_transcript(text)
    
    # Summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        chunk_prompt = f"""
        This is part {i+1} of {len(chunks)} from a longer transcript.
        
        Please provide a concise summary of this segment.
        
        TRANSCRIPT SEGMENT:
        {chunk}
        """
        
        if use_local_llm:
            response = await local_llm_completion(chunk_prompt, SUMMARIZATION_SYSTEM_PROMPT)
        else:
            messages = format_anthropic_messages(chunk_prompt, SUMMARIZATION_SYSTEM_PROMPT)
            response = await anthropic_completion(messages)
            
        chunk_summaries.append(response.strip())
    
    # Combine chunk summaries
    combined_summary = "\n\n".join(chunk_summaries)
    
    # Create final synthesis prompt
    final_prompt = f"""
    You have been provided with summaries of {len(chunks)} segments of a longer transcript.
    Please synthesize these summaries into a coherent, comprehensive summary.
    
    The transcript is from a video titled: {video_title or "Unknown"}
    
    SEGMENT SUMMARIES:
    {combined_summary}
    
    Please create a unified summary that captures the key points and flow of the entire transcript.
    """
    
    # Get final summary
    if use_local_llm:
        response = await local_llm_completion(final_prompt, SUMMARIZATION_SYSTEM_PROMPT)
    else:
        messages = format_anthropic_messages(final_prompt, SUMMARIZATION_SYSTEM_PROMPT)
        response = await anthropic_completion(messages)
    
    return response.strip()

async def identify_themes(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[Theme]:
    """Identify key themes in the transcript."""
    # Prepare prompt
    prompt = format_theme_prompt(text, video_title)
    
    # Get completion
    if use_local_llm:
        response = await local_llm_completion(prompt, THEME_IDENTIFICATION_SYSTEM_PROMPT)
    else:
        messages = format_anthropic_messages(prompt, THEME_IDENTIFICATION_SYSTEM_PROMPT)
        response = await anthropic_completion(messages)
    
    # Parse themes from response
    return parse_themes_from_response(response)

async def generate_insights(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[Insight]:
    """Generate insights from the transcript."""
    # Prepare prompt
    prompt = format_insight_prompt(text, video_title)
    
    # Get completion
    if use_local_llm:
        response = await local_llm_completion(prompt, INSIGHT_GENERATION_SYSTEM_PROMPT)
    else:
        messages = format_anthropic_messages(prompt, INSIGHT_GENERATION_SYSTEM_PROMPT)
        response = await anthropic_completion(messages)
    
    # Parse insights from response
    return parse_insights_from_response(response)

async def extract_keywords(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[str]:
    """Extract keywords from the transcript."""
    # Prepare prompt
    prompt = format_keyword_prompt(text, video_title)
    
    # Get completion
    if use_local_llm:
        response = await local_llm_completion(prompt, KEYWORD_EXTRACTION_SYSTEM_PROMPT)
    else:
        messages = format_anthropic_messages(prompt, KEYWORD_EXTRACTION_SYSTEM_PROMPT)
        response = await anthropic_completion(messages)
    
    # Parse keywords from response
    keywords = [k.strip() for k in response.split(',')]
    return [k for k in keywords if k]  # Filter out empty strings

def parse_themes_from_response(response: str) -> List[Theme]:
    """Parse themes from LLM response."""
    lines = response.strip().split('\n')
    themes = []
    
    current_theme = None
    current_description = []
    current_evidence = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect theme heading (assume starts with number or heading marker)
        if line.startswith(('#', '##', '###', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '-', '*', '•')):
            # Save previous theme if exists
            if current_theme:
                themes.append(Theme(
                    title=current_theme,
                    description='\n'.join(current_description),
                    evidence=[ThemeEvidence(text=e) for e in current_evidence]
                ))
            
            # Extract theme title
            parts = line.split(':', 1)
            if len(parts) > 1:
                # Remove markers and numbering
                title = parts[1].strip()
            else:
                # Remove markers and numbering
                title = line.lstrip('#*•-0123456789. ').strip()
                
            current_theme = title
            current_description = []
            current_evidence = []
            
        elif line.startswith(('Example:', 'Evidence:', 'Quote:')):
            # Evidence line
            evidence_text = line.split(':', 1)[1].strip()
            current_evidence.append(evidence_text)
            
        elif line.startswith('>') or line.startswith('"'):
            # Quote/evidence
            current_evidence.append(line.lstrip('> "').rstrip('"'))
            
        else:
            # Description
            current_description.append(line)
    
    # Add the last theme
    if current_theme:
        themes.append(Theme(
            title=current_theme,
            description='\n'.join(current_description),
            evidence=[ThemeEvidence(text=e) for e in current_evidence]
        ))
    
    return themes

def parse_insights_from_response(response: str) -> List[Insight]:
    """Parse insights from LLM response."""
    lines = response.strip().split('\n')
    insights = []
    
    current_insight = None
    current_description = []
    current_evidence = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect insight heading (assume starts with number or heading marker)
        if line.startswith(('#', '##', '###', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '-', '*', '•')):
            # Save previous insight if exists
            if current_insight:
                insights.append(Insight(
                    title=current_insight,
                    description='\n'.join(current_description),
                    evidence='\n'.join(current_evidence)
                ))
            
            # Extract insight title
            parts = line.split(':', 1)
            if len(parts) > 1:
                # Remove markers and numbering
                title = parts[1].strip()
            else:
                # Remove markers and numbering
                title = line.lstrip('#*•-0123456789. ').strip()
                
            current_insight = title
            current_description = []
            current_evidence = []
            
        elif line.startswith(('Example:', 'Evidence:', 'Quote:', 'Support:')):
            # Evidence line
            evidence_text = line.split(':', 1)[1].strip()
            current_evidence.append(evidence_text)
            
        elif line.startswith('>') or line.startswith('"'):
            # Quote/evidence
            current_evidence.append(line.lstrip('> "').rstrip('"'))
            
        else:
            # Description
            current_description.append(line)
    
    # Add the last insight
    if current_insight:
        insights.append(Insight(
            title=current_insight,
            description='\n'.join(current_description),
            evidence='\n'.join(current_evidence)
        ))
    
    return insights
```

## LLM Client Implementation

```python
# utils/llm_client.py
import os
import asyncio
from typing import List, Dict, Any, Optional
import httpx
import json

# Load environment variables
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

async def anthropic_completion(messages: List[Dict[str, str]], max_tokens: int = 4000) -> str:
    """
    Get completion from Anthropic Claude API.
    
    Args:
        messages: List of message dictionaries (role, content)
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": ANTHROPIC_MODEL,
                "messages": messages,
                "max_tokens": max_tokens
            },
            timeout=60.0  # Longer timeout for large responses
        )
        
        if response.status_code != 200:
            raise Exception(f"Error from Anthropic API: {response.text}")
            
        result = response.json()
        return result["content"][0]["text"]

async def local_llm_completion(prompt: str, system_prompt: str) -> str:
    """
    Get completion from local LLM (using Ollama).
    
    Args:
        prompt: User prompt
        system_prompt: System prompt
        
    Returns:
        Generated text response
    """
    try:
        # Assume Ollama is running locally
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3:13b", # or other available model
                    "prompt": f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]",
                    "stream": False
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Error from local LLM: {response.text}")
                
            result = response.json()
            return result["response"]
    except Exception as e:
        # Fallback to backup model
        print(f"Error with primary local LLM: {str(e)}")
        print("Falling back to backup model...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "mistral:7b", # Fallback model
                    "prompt": f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]",
                    "stream": False
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Error from backup LLM: {response.text}")
                
            result = response.json()
            return result["response"]
```

## API Endpoints - Video MCP Service

```python
# mcp-services/video-mcp/app.py
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
import httpx
import os
import asyncio
from typing import Dict, List, Optional, Any, Union
import json
import time

app = FastAPI(title="Video MCP Service")

# Configuration
VIDEO_ANALYZER_URL = os.getenv("VIDEO_ANALYZER_URL", "http://video-analyzer:8505")
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "./uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Helper functions to standardize MCP interface
async def forward_to_analyzer(endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Forward request to analyzer service."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{VIDEO_ANALYZER_URL}{endpoint}",
            json=data,
            timeout=30.0
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from analyzer: {response.text}"
            )
            
        return response.json()

async def get_from_analyzer(endpoint: str) -> Dict[str, Any]:
    """Get data from analyzer service."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{VIDEO_ANALYZER_URL}{endpoint}",
            timeout=30.0
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from analyzer: {response.text}"
            )
            
        return response.json()

# MCP Endpoints
@app.post("/video.analyze")
async def analyze_video(request: Dict[str, Any]):
    """
    Analyze a YouTube video.
    
    Example request:
    {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "analysis_types": ["summary", "themes", "insights", "keywords"]
    }
    """
    try:
        # Standardize parameter names for MCP interface
        analyzer_request = {
            "url": request.get("url"),
            "analysis_types": request.get("analysis_types", ["all"])
        }
        
        # Forward to analyzer
        result = await forward_to_analyzer("/api/analyze", analyzer_request)
        
        # Return standardized response
        return {
            "job_id": result.get("job_id"),
            "status": result.get("status"),
            "progress": result.get("progress", {}).get("progress", 0.0),
            "message": result.get("progress", {}).get("message", "")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to analyze video: {str(e)}"}
        )

@app.post("/video.upload")
async def upload_video(
    file: UploadFile = File(...),
    analysis_types: Optional[str] = Form(None)
):
    """
    Upload and analyze a video file.
    """
    try:
        # Save file locally
        file_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
        
        # Parse analysis types
        if analysis_types:
            analysis_types_list = json.loads(analysis_types)
        else:
            analysis_types_list = ["all"]
        
        # Forward to analyzer (using multipart form data)
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                files = {"file": (file.filename, f, file.content_type)}
                response = await client.post(
                    f"{VIDEO_ANALYZER_URL}/api/upload",
                    files=files,
                    params={"analysis_types": ",".join(analysis_types_list)},
                    timeout=60.0
                )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from analyzer: {response.text}"
                )
                
            result = response.json()
            
            # Return standardized response
            return {
                "job_id": result.get("job_id"),
                "status": result.get("status"),
                "progress": result.get("progress", {}).get("progress", 0.0),
                "message": result.get("progress", {}).get("message", "")
            }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to upload and analyze video: {str(e)}"}
        )

@app.get("/video.status")
async def get_status(job_id: str):
    """
    Get analysis status.
    """
    try:
        # Forward to analyzer
        result = await get_from_analyzer(f"/api/status/{job_id}")
        
        # Return standardized response
        return {
            "job_id": result.get("job_id"),
            "status": result.get("status"),
            "progress": result.get("progress", {}).get("progress", 0.0),
            "message": result.get("progress", {}).get("message", "")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get status: {str(e)}"}
        )

@app.get("/video.results")
async def get_results(job_id: str):
    """
    Get analysis results.
    """
    try:
        # Forward to analyzer
        result = await get_from_analyzer(f"/api/results/{job_id}")
        
        # Return standardized response with all analysis components
        return {
            "job_id": result.get("job_id"),
            "status": result.get("status"),
            "video_info": result.get("video_info"),
            "summary": result.get("summary"),
            "themes": result.get("themes"),
            "insights": result.get("insights"),
            "keywords": result.get("keywords")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get results: {str(e)}"}
        )

@app.get("/video.transcript")
async def get_transcript(job_id: str, format: str = "txt"):
    """
    Get video transcript.
    
    This endpoint streams the transcript file directly from the analyzer.
    """
    try:
        # Forward to analyzer (streaming response)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VIDEO_ANALYZER_URL}/api/transcript/{job_id}?format={format}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from analyzer: {response.text}"
                )
                
            # Stream response
            return JSONResponse(
                content={
                    "job_id": job_id,
                    "format": format,
                    "content": response.text,
                    "download_url": f"{VIDEO_ANALYZER_URL}/api/transcript/{job_id}?format={format}"
                }
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get transcript: {str(e)}"}
        )

@app.delete("/video.cancel")
async def cancel_job(job_id: str):
    """
    Cancel a running analysis job.
    """
    try:
        # Forward to analyzer
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{VIDEO_ANALYZER_URL}/api/jobs/{job_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from analyzer: {response.text}"
                )
                
            result = response.json()
            
            # Return standardized response
            return {
                "job_id": job_id,
                "status": "cancelled",
                "message": "Job cancelled successfully"
            }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to cancel job: {str(e)}"}
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    try:
        # Check if analyzer is healthy
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VIDEO_ANALYZER_URL}/api/health",
                timeout=5.0
            )
            
            if response.status_code != 200:
                return JSONResponse(
                    status_code=503,
                    content={"status": "unhealthy", "detail": "Analyzer service unavailable"}
                )
                
            return {"status": "healthy"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "detail": f"Error: {str(e)}"}
        )
```

## Agent Tool Definitions

```python
# mcp-services/agent/tools/video_analyzer_tools.py
"""
Video Analyzer tool definitions for the Agent Orchestrator.
"""
from typing import Dict, Any, List, Optional
import httpx
import os
import time
import json
import base64

# Configuration
VIDEO_MCP_URL = os.getenv("VIDEO_MCP_URL", "http://video-mcp:8504")

async def analyze_youtube_video(url: str, analysis_types: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Analyze a YouTube video.
    
    Args:
        url: YouTube URL
        analysis_types: Types of analysis to perform (summary, themes, insights, keywords)
        
    Returns:
        Dictionary with job_id and status
    """
    if not analysis_types:
        analysis_types = ["all"]
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VIDEO_MCP_URL}/video.analyze",
                json={
                    "url": url,
                    "analysis_types": analysis_types
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "error": f"Failed to analyze video: {response.text}"
                }
                
            result = response.json()
            
            # Start polling for status
            job_id = result.get("job_id")
            status = result.get("status")
            
            return {
                "job_id": job_id,
                "status": status,
                "message": "Video analysis started. Use the video.status tool to check progress."
            }
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to analyze video: {str(e)}"
        }

async def get_video_analysis_status(job_id: str) -> Dict[str, Any]:
    """
    Check the status of a video analysis job.
    
    Args:
        job_id: Job ID
        
    Returns:
        Dictionary with status and progress
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VIDEO_MCP_URL}/video.status?job_id={job_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "error": f"Failed to get status: {response.text}"
                }
                
            return response.json()
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to get status: {str(e)}"
        }

async def get_video_analysis_results(job_id: str) -> Dict[str, Any]:
    """
    Get the results of a video analysis job.
    
    Args:
        job_id: Job ID
        
    Returns:
        Dictionary with analysis results
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VIDEO_MCP_URL}/video.results?job_id={job_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "error": f"Failed to get results: {response.text}"
                }
                
            return response.json()
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to get results: {str(e)}"
        }

async def get_video_transcript(job_id: str, format: str = "txt") -> Dict[str, Any]:
    """
    Get the transcript of a video.
    
    Args:
        job_id: Job ID
        format: Transcript format (txt, srt, json)
        
    Returns:
        Dictionary with transcript content
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VIDEO_MCP_URL}/video.transcript?job_id={job_id}&format={format}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "error": f"Failed to get transcript: {response.text}"
                }
                
            return response.json()
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to get transcript: {str(e)}"
        }

async def cancel_video_analysis(job_id: str) -> Dict[str, Any]:
    """
    Cancel a video analysis job.
    
    Args:
        job_id: Job ID
        
    Returns:
        Dictionary with status
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{VIDEO_MCP_URL}/video.cancel?job_id={job_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "error": f"Failed to cancel job: {response.text}"
                }
                
            return response.json()
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to cancel job: {str(e)}"
        }

# Tool definitions for registration with agent orchestrator
VIDEO_ANALYZER_TOOLS = [
    {
        "name": "video.analyze",
        "description": "Analyze a YouTube video to extract transcript, summary, themes, insights, and keywords",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "YouTube URL to analyze"
                },
                "analysis_types": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["summary", "themes", "insights", "keywords", "all"]
                    },
                    "description": "Types of analysis to perform"
                }
            },
            "required": ["url"]
        },
        "function": analyze_youtube_video
    },
    {
        "name": "video.status",
        "description": "Check the status of a video analysis job",
        "parameters": {
            "type": "object",
            "properties": {
                "job_id": {
                    "type": "string",
                    "description": "Job ID returned from video.analyze"
                }
            },
            "required": ["job_id"]
        },
        "function": get_video_analysis_status
    },
    {
        "name": "video.results",
        "description": "Get the results of a video analysis job",
        "parameters": {
            "type": "object",
            "properties": {
                "job_id": {
                    "type": "string",
                    "description": "Job ID returned from video.analyze"
                }
            },
            "required": ["job_id"]
        },
        "function": get_video_analysis_results
    },
    {
        "name": "video.transcript",
        "description": "Get the transcript of a video",
        "parameters": {
            "type": "object",
            "properties": {
                "job_id": {
                    "type": "string",
                    "description": "Job ID returned from video.analyze"
                },
                "format": {
                    "type": "string",
                    "enum": ["txt", "srt", "json"],
                    "description": "Transcript format"
                }
            },
            "required": ["job_id"]
        },
        "function": get_video_transcript
    },
    {
        "name": "video.cancel",
        "description": "Cancel a video analysis job",
        "parameters": {
            "type": "object",
            "properties": {
                "job_id": {
                    "type": "string",
                    "description": "Job ID returned from video.analyze"
                }
            },
            "required": ["job_id"]
        },
        "function": cancel_video_analysis
    }
]
```

## Agent Tool Prompts

```python
# mcp-services/agent/prompts/video_analyzer_prompts.py
"""
Prompts for the Video Analyzer tools to be used by the Agent Orchestrator.
"""

VIDEO_ANALYZER_TOOL_DESCRIPTIONS = """
The Video Analyzer tools allow you to analyze YouTube videos and extract insights from them.

Available tools:
- video.analyze: Analyze a YouTube video to extract transcript, summary, themes, insights, and keywords
- video.status: Check the status of a video analysis job
- video.results: Get the results of a video analysis job
- video.transcript: Get the transcript of a video
- video.cancel: Cancel a video analysis job

Example workflow:
1. Use video.analyze to start analyzing a YouTube video
2. Use video.status to check the progress of the analysis
3. Once completed, use video.results to get the analysis results
4. If needed, use video.transcript to get the full transcript

Example queries:
- "Analyze this YouTube video and summarize it"
- "What are the main themes in this TED talk?"
- "Extract insights from this product review video"
- "What keywords appear most frequently in this video?"
- "Transcribe this interview and highlight key points"
"""

VIDEO_ANALYZER_EXAMPLES = [
    {
        "user": "Analyze this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "assistant": "I'll analyze that YouTube video for you. Let me start the process.\n\n[Using video.analyze to start the analysis]\n\nI've started analyzing the YouTube video. The analysis has been queued and I'll check its progress for you.\n\n[Using video.status to check progress]\n\nThe video is currently being processed. This may take a few minutes depending on the length of the video. I'll let you know once it's complete and then provide you with the analysis results."
    },
    {
        "user": "What are the main themes in this TED talk? https://www.youtube.com/watch?v=8S0FDjFBj8o",
        "assistant": "I'll analyze this TED talk to identify the main themes for you.\n\n[Using video.analyze to start the analysis]\n\nI've started analyzing the TED talk. Let me check on the progress.\n\n[Using video.status to check progress]\n\nThe analysis is complete. Here are the main themes from the TED talk:\n\n1. **Innovation and Problem Solving**: The speaker discusses approaching challenges with creative thinking and finding unconventional solutions.\n\n2. **Persistence and Resilience**: There's emphasis on continuing despite failures and learning from setbacks.\n\n3. **Collaborative Approaches**: The talk highlights the importance of working with diverse teams and perspectives.\n\nEach theme is supported by specific examples and stories from the speaker's experience."
    },
    {
        "user": "Transcribe this product review video and tell me the pros and cons mentioned: https://www.youtube.com/watch?v=example123",
        "assistant": "I'll transcribe and analyze this product review video to identify the pros and cons mentioned.\n\n[Using video.analyze to start the analysis]\n\nI've started the transcription and analysis process. Let me check on its progress.\n\n[Using video.status to check progress]\n\nThe analysis is complete. Let me get the transcript and results.\n\n[Using video.transcript and video.results to get information]\n\nBased on the product review video, here are the pros and cons mentioned:\n\n**Pros:**\n- Excellent battery life (lasts 12+ hours)\n- High-quality display with vibrant colors\n- Fast performance for everyday tasks\n- Compact and lightweight design\n\n**Cons:**\n- Limited port selection (only 2 USB-C ports)\n- Higher price compared to competitors\n- Average camera quality in low light\n- Some software glitches reported\n\nThe reviewer generally had a positive impression of the product, giving it an 8/10 rating despite the few drawbacks mentioned."
    }
]

VIDEO_ANALYZER_USAGE_TIPS = """
Tips for using Video Analyzer tools:

1. Make sure to provide a valid YouTube URL when using video.analyze.

2. For long videos, the analysis may take several minutes. Use video.status to check progress.

3. Different analysis types provide different insights:
   - summary: A concise overview of the video content
   - themes: Recurring topics and patterns in the video
   - insights: Meaningful observations and takeaways
   - keywords: Important terms and concepts mentioned

4. When analyzing very long videos (>30 minutes), consider focusing on specific analysis types rather than requesting all types at once.

5. If you need to cancel a long-running analysis, use video.cancel with the job_id.

6. The transcript can be obtained in different formats:
   - txt: Plain text format, easier to read
   - srt: Subtitle format with timestamps
   - json: Structured format with detailed timing information
"""
```

## WebSocket Integration with Launchpad

Add the following code to the Launchpad's WebSocket proxy to support Video Analyzer:

```python
# Add to launchpad/app.py WebSocket routing section

@app.websocket("/ws-proxy/video-analyzer/{conversation_id}")
async def websocket_proxy_video_analyzer(websocket: WebSocket, conversation_id: str):
    """
    WebSocket proxy for Video Analyzer service.
    
    This routes WebSocket connections from the frontend to the Video Analyzer service
    and proxies messages between them.
    """
    await websocket.accept()
    
    # WebSocket URL for Video Analyzer
    video_analyzer_ws_url = f"{os.getenv('AGENT_WS_URL', 'ws://agent:8500')}/api/ws/{conversation_id}"
    
    try:
        # Connect to Video Analyzer WebSocket
        async with websockets.connect(video_analyzer_ws_url) as analyzer_ws:
            # Bidirectional forwarding of messages
            async def forward_to_analyzer():
                try:
                    while True:
                        message = await websocket.receive_text()
                        await analyzer_ws.send(message)
                except Exception as e:
                    logger.error(f"Error forwarding to analyzer: {str(e)}")
            
            async def forward_from_analyzer():
                try:
                    while True:
                        message = await analyzer_ws.recv()
                        await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error forwarding from analyzer: {str(e)}")
            
            # Run forwarding in both directions concurrently
            await asyncio.gather(
                forward_to_analyzer(),
                forward_from_analyzer()
            )
    except Exception as e:
        logger.error(f"WebSocket proxy error: {str(e)}")
        await websocket.close()
```

## Dependencies

```
# Core dependencies for Video Analyzer
fastapi>=0.95.0
uvicorn>=0.21.1
python-multipart>=0.0.6
pydantic>=1.10.7
httpx>=0.24.0
websockets>=11.0.2
aiofiles>=23.1.0
anthropic>=0.2.0
yt-dlp>=2023.3.4
openai-whisper>=20230314
ffmpeg-python>=0.2.0
torch>=2.0.0
numpy>=1.22.0

# Additional dependencies for analysis
spacy>=3.5.0
scikit-learn>=1.2.2
keybert>=0.7.0
nltk>=3.8.1
```

## Installation and Setup

1. Create the necessary directories:

```bash
mkdir -p internal-solutions-video-analyzer/src/{transcription,analysis,utils}
mkdir -p internal-solutions-video-analyzer/{uploads,transcripts,logs,temp}
mkdir -p mcp-services/video-mcp
```

2. Create a requirements.txt file in each directory:

```bash
# internal-solutions-video-analyzer/requirements.txt
fastapi>=0.95.0
uvicorn>=0.21.1
python-multipart>=0.0.6
pydantic>=1.10.7
httpx>=0.24.0
websockets>=11.0.2
aiofiles>=23.1.0
anthropic>=0.2.0
yt-dlp>=2023.3.4
openai-whisper>=20230314
ffmpeg-python>=0.2.0
torch>=2.0.0
numpy>=1.22.0
spacy>=3.5.0
scikit-learn>=1.2.2
keybert>=0.7.0
nltk>=3.8.1
```

```bash
# mcp-services/video-mcp/requirements.txt
fastapi>=0.95.0
uvicorn>=0.21.1
python-multipart>=0.0.6
pydantic>=1.10.7
httpx>=0.24.0
aiofiles>=23.1.0
```

3. Create a run.py file in each directory:

```python
# internal-solutions-video-analyzer/run.py
import uvicorn
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/video_analyzer.log"),
        logging.StreamHandler()
    ]
)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8505))
    uvicorn.run("src.app:app", host="0.0.0.0", port=port, reload=True)
```

```python
# mcp-services/video-mcp/app.py
import uvicorn
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/video_mcp.log"),
        logging.StreamHandler()
    ]
)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8504))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
```

## Conclusion

This backend implementation provides a comprehensive solution for video analysis with the following components:

1. **Video Analyzer Core Service** - Handles transcription and analysis
2. **Video MCP Service** - Standardized API for agent integration
3. **Agent Tool Definitions** - Integration with the existing Agent Orchestrator
4. **WebSocket Integration** - Real-time progress updates

The implementation follows best practices:

- Asynchronous processing for improved performance
- Robust error handling
- Standardized API design
- Clear separation of concerns
- Comprehensive logging
- Efficient resource management

By following this implementation plan, you can create a scalable and maintainable Video Analyzer component that integrates seamlessly with the existing NXT Humans CX Workbench.