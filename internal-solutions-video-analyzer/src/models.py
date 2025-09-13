from enum import Enum
from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field, HttpUrl, validator
import uuid
import time

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