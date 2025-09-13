from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("video-mcp")

app = FastAPI(title="Video MCP")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Video analyzer service URL
VIDEO_ANALYZER_URL = os.environ.get("VIDEO_ANALYZER_URL", "http://video-analyzer:5000")

@app.get("/")
async def read_root():
    """Root endpoint"""
    return {"message": "Video MCP Service"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "running"}

@app.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    """Forward video analysis request to video analyzer service"""
    try:
        logger.info(f"Forwarding video analysis request for {file.filename}")
        
        # Prepare multipart form data
        files = {"file": (file.filename, await file.read(), file.content_type)}
        
        # Forward request to video analyzer
        response = requests.post(f"{VIDEO_ANALYZER_URL}/upload-video", files=files)
        
        # Check response
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Video analyzer returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video analyzer error: {response.text}"
            )
    
    except requests.RequestException as e:
        logger.error(f"Error connecting to video analyzer: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting to video analyzer: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/jobs")
async def get_jobs():
    """Get all jobs from video analyzer"""
    try:
        response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs")
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Video analyzer returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video analyzer error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error getting jobs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting jobs: {str(e)}"
        )

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job by ID from video analyzer"""
    try:
        response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs/{job_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Video analyzer returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video analyzer error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error getting job: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting job: {str(e)}"
        )

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    """Get transcript for a job from video analyzer"""
    try:
        response = requests.get(f"{VIDEO_ANALYZER_URL}/transcript/{job_id}")
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Video analyzer returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Video analyzer error: {response.text}"
            )
    except Exception as e:
        logger.error(f"Error getting transcript: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting transcript: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8504))
    uvicorn.run(app, host="0.0.0.0", port=port)