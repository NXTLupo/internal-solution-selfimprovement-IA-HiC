#!/usr/bin/env python3
import uvicorn
import os
import logging
import sys

# Create required directories
os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("transcripts", exist_ok=True)
os.makedirs("temp", exist_ok=True)
os.makedirs("src", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/video_analyzer.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("video-analyzer")
logger.info("Starting Video Analyzer service")

# Create a basic app.py in src directory if it doesn't exist
if not os.path.exists("src/app.py"):
    logger.info("Creating minimal app.py in src directory")
    with open("src/app.py", "w") as f:
        f.write("""
from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import time
import logging
import uuid
from datetime import datetime

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

# Directories
UPLOAD_DIR = "../uploads"
TRANSCRIPT_DIR = "../transcripts"
TEMP_DIR = "../temp"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Mock data for active jobs
active_jobs = {}

@app.get("/")
async def read_root():
    """Root endpoint"""
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

async def process_video(job_id: str, file_path: str):
    """Mock video processing function"""
    try:
        logger.info(f"Starting video processing for job {job_id}")
        
        # Simulate video processing with progress updates
        for i in range(1, 101):
            # Update job progress
            active_jobs[job_id]["progress"] = i
            
            # Simulate processing time
            time.sleep(0.2)
        
        # Generate mock transcript
        transcript_path = os.path.join(TRANSCRIPT_DIR, f"{job_id}_transcript.txt")
        with open(transcript_path, "w") as f:
            f.write("This is a mock transcript for demonstration purposes.\\n")
            f.write("It simulates what a real transcription would look like.\\n")
            f.write("In a real implementation, this would contain the actual transcript from the video.")
        
        # Update job status
        active_jobs[job_id]["status"] = "completed"
        active_jobs[job_id]["end_time"] = datetime.now().isoformat()
        active_jobs[job_id]["transcript_path"] = transcript_path
        
        logger.info(f"Video processing completed for job {job_id}")
    
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        
        # Update job status to failed
        if job_id in active_jobs:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(e)

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
""")

# Create empty __init__.py in src directory if it doesn't exist
if not os.path.exists("src/__init__.py"):
    logger.info("Creating __init__.py in src directory")
    with open("src/__init__.py", "w") as f:
        f.write("")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("src.app:app", host="0.0.0.0", port=port, reload=False)