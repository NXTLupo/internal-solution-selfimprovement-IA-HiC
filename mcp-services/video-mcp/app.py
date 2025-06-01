"""
Video Transcriptor MCP Service
-----------------------------
This service wraps the Video Transcriptor tool in a Model Context Protocol (MCP)
compatible interface, allowing the agent to use it for video transcription and analysis.
"""

import os
import json
import uuid
import tempfile
import requests
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("video-mcp")

# Configuration
VIDEO_ANALYZER_URL = os.environ.get("VIDEO_ANALYZER_URL", "http://video-analyzer:5000")

# Models
class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="Video Transcriptor MCP Service",
    description="MCP-compatible service for the Video Transcriptor",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for job status
job_cache: Dict[str, Dict[str, Any]] = {}

# MCP Tools definition
@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    tools = [
        MCPToolSpec(
            name="video_transcribe_file",
            description="Upload and transcribe a video file",
            parameters={
                "type": "object",
                "properties": {
                    "file_content": {
                        "type": "string",
                        "description": "Base64 encoded video file content"
                    },
                    "file_name": {
                        "type": "string",
                        "description": "Name of the video file"
                    }
                },
                "required": ["file_content", "file_name"]
            },
            returns={
                "job_id": {
                    "type": "string",
                    "description": "Job ID for tracking transcription progress"
                },
                "status": {
                    "type": "string",
                    "description": "Initial job status"
                }
            }
        ),
        MCPToolSpec(
            name="video_transcribe_youtube",
            description="Transcribe a YouTube video by URL",
            parameters={
                "type": "object",
                "properties": {
                    "youtube_url": {
                        "type": "string",
                        "description": "YouTube video URL to transcribe"
                    }
                },
                "required": ["youtube_url"]
            },
            returns={
                "job_id": {
                    "type": "string",
                    "description": "Job ID for tracking transcription progress"
                },
                "status": {
                    "type": "string",
                    "description": "Initial job status"
                }
            }
        ),
        MCPToolSpec(
            name="video_get_job_status",
            description="Check the status of a video transcription job",
            parameters={
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "string",
                        "description": "Job ID from a previous transcription request"
                    }
                },
                "required": ["job_id"]
            },
            returns={
                "status": {
                    "type": "string",
                    "description": "Job status (pending, processing, completed, failed)"
                },
                "progress": {
                    "type": "number",
                    "description": "Progress percentage (0-100)"
                },
                "message": {
                    "type": "string",
                    "description": "Status message or error details"
                }
            }
        ),
        MCPToolSpec(
            name="video_get_transcript",
            description="Get the transcript of a completed transcription job",
            parameters={
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "string",
                        "description": "Job ID from a previous transcription request"
                    }
                },
                "required": ["job_id"]
            },
            returns={
                "transcript": {
                    "type": "string",
                    "description": "Full transcript text"
                },
                "transcript_segments": {
                    "type": "array",
                    "description": "Transcript with timestamps",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "number"},
                            "end": {"type": "number"},
                            "text": {"type": "string"}
                        }
                    }
                },
                "download_url": {
                    "type": "string",
                    "description": "URL to download transcript in JSON format"
                }
            }
        ),
        MCPToolSpec(
            name="video_list_jobs",
            description="List all video transcription jobs",
            parameters={
                "type": "object",
                "properties": {},
                "required": []
            },
            returns={
                "jobs": {
                    "type": "array",
                    "description": "List of transcription jobs",
                    "items": {
                        "type": "object",
                        "properties": {
                            "job_id": {"type": "string"},
                            "status": {"type": "string"},
                            "created_at": {"type": "string"},
                            "video_info": {"type": "object"}
                        }
                    }
                }
            }
        )
    ]
    return tools

@app.post("/mcp/invoke/video_transcribe_file", response_model=Dict[str, Any])
async def invoke_transcribe_file(
    file: UploadFile = File(...),
    file_name: Optional[str] = Form(None)
):
    """MCP endpoint to transcribe an uploaded video file"""
    try:
        # Get file name from either parameter or from the uploaded file
        actual_file_name = file_name or file.filename
        
        if not actual_file_name:
            raise HTTPException(
                status_code=400,
                detail="File name not provided"
            )
        
        logger.info(f"Starting transcription for uploaded file: {actual_file_name}")
        
        # Prepare multipart form data
        files = {"file": (actual_file_name, await file.read(), file.content_type)}
        
        # Forward request to video analyzer
        response = requests.post(
            urljoin(VIDEO_ANALYZER_URL, "/upload-video"),
            files=files
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            job_id = result.get("job_id")
            
            if not job_id:
                raise HTTPException(
                    status_code=500,
                    detail="No job ID returned from Video Transcriptor"
                )
            
            # Cache the job info
            job_cache[job_id] = {
                "type": "file_upload",
                "file_name": actual_file_name,
                "status": "pending"
            }
            
            return {
                "job_id": job_id,
                "status": result.get("status", "pending")
            }
        else:
            logger.error(f"Video transcriptor returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video transcriptor error: {response.text}"
            )
    
    except Exception as e:
        logger.exception("Error transcribing video file")
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing video file: {str(e)}"
        )

@app.post("/mcp/invoke/video_transcribe_youtube", response_model=Dict[str, Any])
async def invoke_transcribe_youtube(
    youtube_url: str = Form(...)
):
    """MCP endpoint to transcribe a YouTube video"""
    try:
        logger.info(f"Starting transcription for YouTube URL: {youtube_url}")
        
        # Prepare request data
        data = {"url": youtube_url}
        
        # Forward request to video analyzer
        response = requests.post(
            urljoin(VIDEO_ANALYZER_URL, "/analyze-youtube"),
            json=data
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            job_id = result.get("job_id")
            
            if not job_id:
                raise HTTPException(
                    status_code=500,
                    detail="No job ID returned from Video Transcriptor"
                )
            
            # Cache the job info
            job_cache[job_id] = {
                "type": "youtube_url",
                "youtube_url": youtube_url,
                "status": "pending"
            }
            
            return {
                "job_id": job_id,
                "status": result.get("status", "pending")
            }
        else:
            logger.error(f"Video transcriptor returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video transcriptor error: {response.text}"
            )
    
    except Exception as e:
        logger.exception("Error transcribing YouTube video")
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing YouTube video: {str(e)}"
        )

@app.post("/mcp/invoke/video_get_job_status", response_model=Dict[str, Any])
async def invoke_get_job_status(job_id: str = Form(...)):
    """MCP endpoint to check video transcription job status"""
    try:
        # Send status request to Video Transcriptor
        response = requests.get(
            urljoin(VIDEO_ANALYZER_URL, f"/jobs/{job_id}")
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract relevant information
            status_info = {
                "status": result.get("status", "unknown"),
                "progress": result.get("progress", 0),
                "message": result.get("message", "")
            }
            
            # Update cache
            if job_id in job_cache:
                job_cache[job_id]["status"] = status_info["status"]
            
            return status_info
        else:
            logger.error(f"Error getting job status: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting job status: {response.text}"
            )
        
    except Exception as e:
        logger.exception("Error getting video transcription status")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting video transcription status: {str(e)}"
        )

@app.post("/mcp/invoke/video_get_transcript", response_model=Dict[str, Any])
async def invoke_get_transcript(job_id: str = Form(...)):
    """MCP endpoint to get video transcription results"""
    try:
        # Send transcript request to Video Transcriptor
        response = requests.get(
            urljoin(VIDEO_ANALYZER_URL, f"/transcript/{job_id}")
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Prepare the download URL
            video_analyzer_client_url = os.environ.get(
                "VIDEO_ANALYZER_CLIENT_URL",
                "http://localhost:5002"  # Default external port for video analyzer
            )
            download_url = f"{video_analyzer_client_url}/transcript/{job_id}"
            
            # Extract transcript information
            transcript = result.get("transcript", "")
            transcript_segments = result.get("segments", [])
            
            return {
                "transcript": transcript,
                "transcript_segments": transcript_segments,
                "download_url": download_url
            }
        else:
            logger.error(f"Error getting transcript: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting transcript: {response.text}"
            )
        
    except Exception as e:
        logger.exception("Error getting video transcript")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting video transcript: {str(e)}"
        )

@app.post("/mcp/invoke/video_list_jobs", response_model=Dict[str, Any])
async def invoke_list_jobs():
    """MCP endpoint to list all video transcription jobs"""
    try:
        # Send request to Video Transcriptor
        response = requests.get(
            urljoin(VIDEO_ANALYZER_URL, "/jobs")
        )
        
        if response.status_code == 200:
            result = response.json()
            jobs = result if isinstance(result, list) else result.get("jobs", [])
            
            # Process jobs to make them more concise
            processed_jobs = []
            for job in jobs:
                processed_jobs.append({
                    "job_id": job.get("id") or job.get("job_id", ""),
                    "status": job.get("status", "unknown"),
                    "created_at": job.get("created_at", ""),
                    "video_info": job.get("video_info", {})
                })
            
            return {"jobs": processed_jobs}
        else:
            logger.error(f"Error listing jobs: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error listing jobs: {response.text}"
            )
        
    except Exception as e:
        logger.exception("Error listing video transcription jobs")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing video transcription jobs: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "video-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Video Transcriptor MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp/tools": "Get available tools",
            "mcp/invoke/video.transcribe_file": "Transcribe uploaded video file",
            "mcp/invoke/video.transcribe_youtube": "Transcribe YouTube video",
            "mcp/invoke/video.get_job_status": "Check transcription status",
            "mcp/invoke/video.get_transcript": "Get transcription results",
            "mcp/invoke/video.list_jobs": "List all transcription jobs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8504))
    uvicorn.run(app, host="0.0.0.0", port=port)