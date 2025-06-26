"""
Dataset Preparation Studio - Simple Image Captioning & ZIP Export
Prepare training datasets with auto-captioning via A11y Image Captioner service
"""

import os
import sys
import json
import uuid
import shutil
import asyncio
import logging
import aiohttp
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# App configuration
app = FastAPI(
    title="Dataset Preparation Studio",
    description="Simple Image Captioning & Dataset ZIP Export for Training",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Directory setup
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
DATASET_DIR = BASE_DIR / "datasets" 
ZIP_DIR = BASE_DIR / "zips"

# Create directories
for directory in [UPLOAD_DIR, DATASET_DIR, ZIP_DIR]:
    directory.mkdir(exist_ok=True)

# A11y Image Captioner Service Configuration
IMAGE_CAPTIONER_URL = os.environ.get('IMAGE_CAPTIONER_URL', 'http://image-captioner:5005')

# In-memory dataset preparation tracking
dataset_projects = {}

class DatasetProject:
    def __init__(self, project_id: str, project_name: str):
        self.project_id = project_id
        self.project_name = project_name
        self.created_at = datetime.now()
        self.files = []
        self.zip_path = None
    
    def add_file(self, filename: str, caption: str, file_size: int):
        self.files.append({
            "filename": filename,
            "caption": caption,
            "size": file_size,
            "timestamp": datetime.now().isoformat()
        })

class DatasetConfig(BaseModel):
    project_name: str
    project_id: str

async def call_image_captioner_service(image_file_path: Path, original_filename: str) -> Dict[str, Any]:
    """Call the A11y Image Captioner service to generate captions"""
    logger.info(f"Calling A11y Image Captioner at: {IMAGE_CAPTIONER_URL}")
    
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
            # Health check
            try:
                async with session.get(f"{IMAGE_CAPTIONER_URL}/health", timeout=10) as health_response:
                    if health_response.status != 200:
                        return {"caption": "", "error": f"Image captioner unavailable (status: {health_response.status})"}
            except Exception as e:
                return {"caption": "", "error": f"Cannot connect to image captioner: {str(e)}"}
            
            # Generate caption
            with open(image_file_path, 'rb') as f:
                file_data = aiohttp.FormData()
                file_data.add_field('file', f, filename=original_filename, content_type='image/jpeg')
                
                async with session.post(f"{IMAGE_CAPTIONER_URL}/caption-single", data=file_data, timeout=60) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "caption": result.get("caption", ""),
                            "confidence": result.get("confidence", 0.0),
                            "error": None
                        }
                    else:
                        error_text = await response.text()
                        return {"caption": "", "error": f"Caption service error ({response.status}): {error_text}"}
                        
    except Exception as e:
        return {"caption": "", "error": f"Caption generation failed: {str(e)}"}

def create_dataset_zip(project_id: str, project_name: str) -> Path:
    """Create a ZIP file containing images and caption files"""
    try:
        project_dir = DATASET_DIR / project_id / "img"
        zip_filename = f"{project_name}_{project_id[:8]}.zip"
        zip_path = ZIP_DIR / zip_filename
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all files from the project directory
            for file_path in project_dir.glob("*"):
                if file_path.is_file():
                    # Add file to zip with relative path
                    zipf.write(file_path, file_path.name)
        
        logger.info(f"Created dataset ZIP: {zip_path}")
        return zip_path
    except Exception as e:
        logger.error(f"Error creating ZIP file: {str(e)}")
        raise

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main Dataset Preparation Studio interface"""
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html><head><title>Dataset Preparation Studio</title></head>
        <body style="font-family: Arial; padding: 20px; background: #121B26; color: white;">
        <h1 style="color: #01C4C8;">📦 Dataset Preparation Studio</h1>
        <p>Simple Image Captioning & Dataset ZIP Export</p>
        <p>Template loading...</p>
        </body></html>
        """)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check A11y Image Captioner service availability
    captioner_available = False
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            async with session.get(f"{IMAGE_CAPTIONER_URL}/health") as response:
                captioner_available = response.status == 200
    except Exception:
        pass
    
    return {
        "status": "healthy",
        "service": "dataset-preparation-studio",
        "timestamp": datetime.now().isoformat(),
        "mode": "dataset_preparation_only",
        "image_captioner_url": IMAGE_CAPTIONER_URL,
        "image_captioner_available": captioner_available,
        "features": [
            "Image upload and processing",
            "Auto-captioning via A11y Image Captioner",
            "Manual caption editing",
            "Dataset ZIP export"
        ]
    }

# Removed Kohya setup endpoint - not needed for dataset preparation

@app.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload and process images with auto-captioning for dataset preparation"""
    try:
        project_id = str(uuid.uuid4())
        project_dir = DATASET_DIR / project_id / "img"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        
        for file in files:
            if not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
            
            # Convert to JPG format for better compatibility
            file_path = project_dir / f"{file.filename.rsplit('.', 1)[0]}.jpg"
            content = await file.read()
            
            # Convert to JPG using PIL
            from PIL import Image
            import io
            
            # Load image and convert to JPG
            img = Image.open(io.BytesIO(content))
            if img.mode in ('RGBA', 'LA', 'P'):
                # Convert to RGB for JPG
                img = img.convert('RGB')
            
            # Save as JPG with good quality
            img.save(file_path, 'JPEG', quality=95, optimize=True)
            
            # Generate caption
            caption_result = await call_image_captioner_service(file_path, file.filename)
            final_caption = caption_result.get("caption") or f"image of {file.filename.rsplit('.', 1)[0]}"
            
            # Create caption file
            caption_file = project_dir / f"{file.filename.rsplit('.', 1)[0]}.txt" 
            with open(caption_file, "w", encoding="utf-8") as caption_f:
                caption_f.write(final_caption)
            
            file_info = {
                "filename": file.filename,
                "size": len(content),
                "caption": final_caption,
                "caption_confidence": caption_result.get("confidence", 0.0),
                "caption_error": caption_result.get("error"),
                "dataset_ready": True
            }
            uploaded_files.append(file_info)
        
        logger.info(f"Processed {len(files)} files for dataset preparation - project {project_id}")
        
        return {
            "project_id": project_id,
            "uploaded_files": len(files),
            "files": uploaded_files,
            "status": "success",
            "message": "Dataset ready for ZIP export"
        }
        
    except Exception as e:
        logger.error(f"Error processing images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-caption")
async def update_caption(
    project_id: str = Form(...),
    filename: str = Form(...),
    caption: str = Form(...)
):
    """Update caption for a specific image"""
    try:
        project_dir = DATASET_DIR / project_id / "img"
        caption_file = project_dir / f"{filename.rsplit('.', 1)[0]}.txt"
        
        with open(caption_file, "w", encoding="utf-8") as f:
            f.write(caption)
        
        logger.info(f"Updated caption for {filename} in project {project_id}")
        
        return {
            "status": "success",
            "message": f"Caption updated for {filename}",
            "project_id": project_id,
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"Error updating caption: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-dataset-zip")
async def create_dataset_zip_endpoint(config: DatasetConfig):
    """Create and download a ZIP file containing the dataset"""
    try:
        # Validate project exists
        project_dir = DATASET_DIR / config.project_id / "img"
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Create ZIP file
        zip_path = create_dataset_zip(config.project_id, config.project_name)
        
        # Store project info
        project = DatasetProject(config.project_id, config.project_name)
        project.zip_path = str(zip_path)
        dataset_projects[config.project_id] = project
        
        logger.info(f"Created dataset ZIP for project {config.project_id}")
        
        return {
            "status": "success",
            "project_id": config.project_id,
            "zip_filename": zip_path.name,
            "message": "Dataset ZIP created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating dataset ZIP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download-dataset/{project_id}")
async def download_dataset(project_id: str):
    """Download the dataset ZIP file"""
    if project_id not in dataset_projects:
        raise HTTPException(status_code=404, detail="Dataset project not found")
    
    project = dataset_projects[project_id]
    
    if not project.zip_path or not Path(project.zip_path).exists():
        raise HTTPException(status_code=404, detail="Dataset ZIP file not found")
    
    zip_path = Path(project.zip_path)
    return FileResponse(
        path=str(zip_path),
        filename=f"{project.project_name}_dataset.zip",
        media_type='application/zip'
    )

@app.get("/api/projects")
async def list_projects():
    """List all dataset projects"""
    projects_list = []
    for project_id, project in dataset_projects.items():
        projects_list.append({
            "project_id": project_id,
            "project_name": project.project_name,
            "files_count": len(project.files),
            "created_at": project.created_at.isoformat(),
            "zip_available": project.zip_path is not None
        })
    
    return {"projects": projects_list}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5006))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )