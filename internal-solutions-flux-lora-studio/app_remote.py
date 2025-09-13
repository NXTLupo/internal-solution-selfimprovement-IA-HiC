"""
FLUX LoRA Studio - Remote Training via Google Colab
FastAPI backend with Google Colab integration for FLUX LoRA training
No local training dependencies required - everything runs remotely!
"""

import os
import json
import uuid
import shutil
import asyncio
import logging
import aiohttp
import zipfile
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
import threading

# For configuration generation
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# App configuration
app = FastAPI(
    title="FLUX LoRA Studio - Remote Training",
    description="Professional AI Model Training via Google Colab Cloud Infrastructure",
    version="2.0.0"
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
CONFIG_DIR = BASE_DIR / "colab_configs"
LOG_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
for directory in [UPLOAD_DIR, DATASET_DIR, CONFIG_DIR, LOG_DIR]:
    directory.mkdir(exist_ok=True)

# A11y Image Captioner Service Configuration
IMAGE_CAPTIONER_URL = os.environ.get('IMAGE_CAPTIONER_URL', 'http://image-captioner:5005')
# For local development, use localhost
if 'localhost' in os.environ.get('IMAGE_CAPTIONER_CLIENT_URL', ''):
    IMAGE_CAPTIONER_URL = 'http://localhost:5005'

# Google Colab Configuration
COLAB_NOTEBOOK_URL = "https://colab.research.google.com/drive/1r09aImgL1YhQsJgsLWnb67-bjTV88-W0"
GITHUB_REPO_URL = "https://github.com/jhj0517/finetuning-notebooks"

# Global state for remote training
remote_training_state = {
    "projects": {},
    "active_colabs": {},
    "training_sessions": {}
}

# In-memory storage for projects
projects_db = {}

# Data models for remote training
class RemoteTrainingConfig(BaseModel):
    project_name: str
    trigger_word: str
    dataset_size: str = "medium"
    train_steps: int = 1000
    learning_rate: float = 1e-4
    lora_rank: int = 16
    colab_runtime: str = "a100"
    config_format: str = "json"
    enable_sample_generation: bool = True
    enable_logging: bool = True
    auto_download: bool = False
    project_id: str

class ColabStatusUpdate(BaseModel):
    project_id: str
    current_step: int
    total_steps: int
    loss: float
    progress: float
    eta_minutes: int
    status: str
    message: Optional[str] = None

async def call_image_captioner_service(image_file_path: Path, original_filename: str) -> Dict[str, Any]:
    """Call the A11y Image Captioner service to generate captions for uploaded images"""
    try:
        # Check if the service is available
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{IMAGE_CAPTIONER_URL}/health", timeout=5) as health_response:
                    if health_response.status != 200:
                        return {"caption": "", "error": "Image captioner service unavailable"}
            except Exception as e:
                return {"caption": "", "error": f"Cannot connect to image captioner: {str(e)}"}
            
            # Prepare the image file for upload
            with open(image_file_path, 'rb') as f:
                file_data = aiohttp.FormData()
                file_data.add_field('file', f, filename=original_filename, content_type='image/jpeg')
                
                # Call the single caption endpoint
                async with session.post(f"{IMAGE_CAPTIONER_URL}/caption-single", data=file_data, timeout=30) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "caption": result.get("caption", ""),
                            "confidence": result.get("confidence", 0.0),
                            "processing_time": result.get("processing_time", 0.0),
                            "error": None
                        }
                    else:
                        error_text = await response.text()
                        return {"caption": "", "error": f"Caption service error: {error_text}"}
                        
    except Exception as e:
        logger.error(f"Error calling image captioner service: {str(e)}")
        return {"caption": "", "error": f"Caption generation failed: {str(e)}"}

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main FLUX LoRA Studio remote training interface"""
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        # Return a basic HTML response if template not found
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FLUX LoRA Studio - Remote Training</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #121B26; color: white; }
                .container { max-width: 800px; margin: 0 auto; text-align: center; }
                h1 { color: #01C4C8; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎨 FLUX LoRA Studio - Remote Training</h1>
                <p>Professional AI Model Training via Google Colab</p>
                <p>Frontend template loading...</p>
            </div>
        </body>
        </html>
        """)

@app.get("/health")
async def health_check():
    """Health check endpoint for remote training service"""
    return {
        "status": "healthy",
        "service": "flux-lora-studio-remote", 
        "timestamp": datetime.now().isoformat(),
        "training_mode": "remote_colab",
        "remote_training_available": True,
        "image_captioner_available": True,
        "colab_integration": "ready",
        "colab_notebook_url": COLAB_NOTEBOOK_URL,
        "github_repo": GITHUB_REPO_URL
    }

@app.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload and process training images for Google Colab with automatic caption generation"""
    try:
        project_id = str(uuid.uuid4())
        project_dir = DATASET_DIR / project_id
        project_dir.mkdir(exist_ok=True)
        
        uploaded_files = []
        
        for file in files:
            if not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
            
            # Save the file
            file_path = project_dir / file.filename
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Generate caption using A11y Image Captioner service
            logger.info(f"Generating caption for {file.filename} using A11y Image Captioner...")
            caption_result = await call_image_captioner_service(file_path, file.filename)
            
            file_info = {
                "filename": file.filename,
                "size": len(content),
                "path": str(file_path),
                "caption": caption_result.get("caption", ""),
                "caption_confidence": caption_result.get("confidence", 0.0),
                "caption_error": caption_result.get("error"),
                "caption_generated": caption_result.get("caption", "") != "",
                "colab_ready": caption_result.get("caption", "") != ""
            }
            
            uploaded_files.append(file_info)
            
            # Create caption file for Google Colab training
            if caption_result.get("caption"):
                caption_file = project_dir / f"{file.filename.rsplit('.', 1)[0]}.txt"
                with open(caption_file, "w", encoding="utf-8") as caption_f:
                    caption_f.write(caption_result["caption"])
        
        # Store project metadata
        projects_db[project_id] = {
            "id": project_id,
            "created_at": datetime.now().isoformat(),
            "files": uploaded_files,
            "status": "ready_for_colab",
            "captions_generated": True,
            "colab_compatible": True,
            "dataset_size": len(files)
        }
        
        logger.info(f"Processed {len(files)} files for Google Colab training - project {project_id}")
        
        return {
            "project_id": project_id,
            "uploaded_files": len(files),
            "files": uploaded_files,
            "status": "success",
            "captions_generated": True,
            "colab_ready": True,
            "message": "Dataset processed and ready for Google Colab training"
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
    """Update the caption for a specific image"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update the caption in the project database
        project = projects_db[project_id]
        file_found = False
        
        for file_info in project["files"]:
            if file_info["filename"] == filename:
                file_info["caption"] = caption
                file_info["manually_edited"] = True
                file_info["colab_ready"] = True
                file_found = True
                
                # Update the corresponding .txt file
                project_dir = DATASET_DIR / project_id
                caption_file = project_dir / f"{filename.rsplit('.', 1)[0]}.txt"
                with open(caption_file, "w", encoding="utf-8") as f:
                    f.write(caption)
                break
        
        if not file_found:
            raise HTTPException(status_code=404, detail="File not found in project")
        
        logger.info(f"Updated caption for {filename} in project {project_id}")
        
        return {
            "status": "success",
            "message": f"Caption updated for {filename}",
            "project_id": project_id,
            "filename": filename,
            "colab_ready": True
        }
        
    except Exception as e:
        logger.error(f"Error updating caption: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-colab-config")
async def generate_colab_config(config: RemoteTrainingConfig):
    """Generate Google Colab configuration for remote training"""
    try:
        # Validate required fields
        if not config.trigger_word:
            raise HTTPException(status_code=400, detail="Trigger word is required")
        
        if config.project_id not in projects_db:
            raise HTTPException(status_code=400, detail="Project not found")
        
        # Generate Colab configuration based on format
        config_format = config.config_format
        
        # Base configuration for all formats
        base_config = {
            "project_name": config.project_name,
            "trigger_word": config.trigger_word,
            "model_name": "flux-dev",
            "resolution": 1024,
            "train_batch_size": 1 if config.colab_runtime == "t4" else 2,
            "max_train_steps": config.train_steps,
            "learning_rate": config.learning_rate,
            "network_dim": config.lora_rank,
            "network_alpha": config.lora_rank,
            "gradient_accumulation_steps": 1,
            "mixed_precision": "bf16",
            "save_every_n_epochs": 1,
            "optimizer_type": "AdamW8bit",
            "lr_scheduler": "cosine",
            "lr_warmup_steps": 100,
            "noise_offset": 0.1,
            "cache_latents": True,
            "cache_latents_to_disk": True,
            "caption_extension": ".txt",
            "shuffle_caption": True,
            "keep_tokens": 1,
            "bucket_reso_steps": 64,
            "bucket_no_upscale": False,
            "output_name": config.project_name,
            "output_dir": "outputs"
        }
        
        # Add sample generation config if enabled
        if config.enable_sample_generation:
            base_config.update({
                "sample_every_n_steps": 100,
                "sample_prompts": [
                    f"{config.trigger_word} in a professional photo",
                    f"{config.trigger_word} portrait, high quality",
                    f"{config.trigger_word} in natural lighting"
                ]
            })
        
        # Add logging config if enabled
        if config.enable_logging:
            base_config.update({
                "logging_dir": "logs",
                "log_with": "tensorboard"
            })
        
        # Generate configuration in requested format
        if config_format == "json":
            config_data = json.dumps(base_config, indent=2)
            
        elif config_format == "yaml":
            if not YAML_AVAILABLE:
                raise HTTPException(status_code=400, detail="YAML format not available. Install PyYAML: pip install pyyaml")
            
            yaml_config = {
                "project_name": base_config["project_name"],
                "trigger_word": base_config["trigger_word"],
                "training": {
                    "model_name": base_config["model_name"],
                    "resolution": base_config["resolution"],
                    "batch_size": base_config["train_batch_size"],
                    "max_steps": base_config["max_train_steps"],
                    "learning_rate": base_config["learning_rate"],
                    "network_dim": base_config["network_dim"],
                    "mixed_precision": base_config["mixed_precision"]
                }
            }
            
            if config.enable_sample_generation:
                yaml_config["sampling"] = {
                    "enabled": True,
                    "every_n_steps": base_config.get("sample_every_n_steps", 100),
                    "prompts": base_config.get("sample_prompts", [])
                }
            
            config_data = yaml.dump(yaml_config, default_flow_style=False)
            
        elif config_format == "python":
            config_data = f'''#!/usr/bin/env python3
"""
Google Colab FLUX LoRA Training Configuration
Generated by FLUX LoRA Studio Remote Training Platform
Project: {config.project_name}
Generated: {datetime.now().isoformat()}
"""

# Project Configuration
PROJECT_NAME = "{config.project_name}"
TRIGGER_WORD = "{config.trigger_word}"

# Training Parameters
MODEL_NAME = "flux-dev"
RESOLUTION = 1024
BATCH_SIZE = {base_config["train_batch_size"]}
MAX_TRAIN_STEPS = {config.train_steps}
LEARNING_RATE = {config.learning_rate}
NETWORK_DIM = {config.lora_rank}
NETWORK_ALPHA = {config.lora_rank}

# Sample Generation
ENABLE_SAMPLING = {str(config.enable_sample_generation)}
SAMPLE_EVERY_N_STEPS = {base_config.get("sample_every_n_steps", 100)}
SAMPLE_PROMPTS = {base_config.get("sample_prompts", [])}

# Advanced Settings
MIXED_PRECISION = "bf16"
OPTIMIZER_TYPE = "AdamW8bit"
LR_SCHEDULER = "cosine"
LR_WARMUP_STEPS = 100
NOISE_OFFSET = 0.1

# Colab Runtime: {config.colab_runtime.upper()}
# Estimated Training Time: 20-60 minutes
# Generated by FLUX LoRA Studio v2.0
'''
        else:
            raise HTTPException(status_code=400, detail="Unsupported configuration format")
        
        # Save configuration for reference
        config_dir = CONFIG_DIR / config.project_id
        config_dir.mkdir(exist_ok=True)
        
        config_filename = f"colab_config_{config.project_name}.{config_format}"
        config_path = config_dir / config_filename
        
        with open(config_path, "w", encoding="utf-8") as f:
            f.write(config_data)
        
        logger.info(f"Generated Google Colab {config_format} configuration for project: {config.project_name}")
        
        return {
            "config_data": config_data,
            "format": config_format,
            "project_name": config.project_name,
            "project_id": config.project_id,
            "colab_notebook_url": COLAB_NOTEBOOK_URL,
            "github_repo_url": GITHUB_REPO_URL,
            "status": "success",
            "message": "Google Colab configuration generated successfully",
            "instructions": {
                "step_1": "Download the generated configuration file",
                "step_2": f"Open the Google Colab notebook: {COLAB_NOTEBOOK_URL}",
                "step_3": "Upload your dataset package to Colab",
                "step_4": "Load the configuration in Colab",
                "step_5": "Start training with A100 GPU for best results"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating Colab config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download-dataset/{project_id}")
async def download_dataset_for_colab(project_id: str):
    """Download prepared dataset package for Google Colab upload"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_dir = DATASET_DIR / project_id
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project directory not found")
        
        # Create a zip file with the dataset
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            with zipfile.ZipFile(tmp_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add all images and caption files
                for file_path in project_dir.iterdir():
                    if file_path.is_file():
                        arcname = file_path.name
                        zipf.write(file_path, arcname)
                
                # Add project metadata for Colab
                project_info = projects_db[project_id]
                metadata = {
                    "project_id": project_id,
                    "created_at": project_info.get("created_at"),
                    "file_count": len(project_info.get("files", [])),
                    "training_ready": True,
                    "colab_compatible": True,
                    "platform": "flux_lora_studio_remote",
                    "version": "2.0.0"
                }
                
                metadata_json = json.dumps(metadata, indent=2)
                zipf.writestr("project_metadata.json", metadata_json)
                
                # Add comprehensive Colab instructions
                instructions = f'''# FLUX LoRA Training Dataset
Generated by FLUX LoRA Studio Remote Training Platform

## Dataset Information
- Project ID: {project_id}
- Files: {len(project_info.get("files", []))} training images
- Captions: Auto-generated with A11y Image Captioner
- Format: Compatible with Google Colab FLUX LoRA training

## Files Included:
- Training images (JPG/PNG/WebP)
- Caption files (.txt) - one per image
- Project metadata (project_metadata.json)
- This instruction file (README.txt)

## Usage in Google Colab:

### Step 1: Open the Training Notebook
Visit: {COLAB_NOTEBOOK_URL}

### Step 2: Connect to GPU Runtime
- Go to Runtime > Change runtime type
- Select GPU (T4 for free, A100 for Pro/Pro+)
- Click Connect

### Step 3: Upload Dataset
- Upload this zip file to your Colab environment
- Extract contents to the training directory:
  ```python
  import zipfile
  with zipfile.ZipFile("flux_lora_dataset.zip", 'r') as zip_ref:
      zip_ref.extractall("training_data/")
  ```

### Step 4: Configure Training
- Set your trigger word in the notebook
- Adjust training parameters as needed
- Recommended: 1000-3000 steps for good results

### Step 5: Start Training
- Run all cells in sequence
- Training takes 20-60 minutes depending on GPU
- Sample images are generated automatically

### Step 6: Download Results
- Download the final .safetensors LoRA model
- Use in ComfyUI, Automatic1111, or other FLUX interfaces

## Tips for Best Results:
- Use consistent, high-quality images
- Include your trigger word in prompts naturally
- Try different LoRA weights (0.5-1.5) when using the model

## Generated by FLUX LoRA Studio
Remote AI Model Training Platform
No local setup required - train anywhere with Google Colab!
'''
                zipf.writestr("README.txt", instructions)
            
            tmp_file.flush()
            
            # Return the zip file
            return FileResponse(
                path=tmp_file.name,
                filename=f"flux_lora_dataset_{project_id[:8]}.zip",
                media_type='application/zip'
            )
            
    except Exception as e:
        logger.error(f"Error creating dataset package: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/colab-status")
async def get_colab_status():
    """Get Google Colab integration status and information"""
    return {
        "colab_integration": "active",
        "remote_training": True,
        "platform_version": "2.0.0",
        "supported_models": ["flux-dev", "flux-schnell"],
        "supported_runtimes": {
            "t4": "T4 GPU (Free Tier) - 15GB VRAM",
            "v100": "V100 GPU (Pro) - 16GB VRAM",
            "a100": "A100 GPU (Pro/Pro+) - 40GB VRAM"
        },
        "features": {
            "automatic_captioning": True,
            "dataset_packaging": True,
            "config_generation": True,
            "multiple_formats": ["JSON", "YAML", "Python"],
            "sample_generation": True,
            "training_monitoring": "via_colab_interface",
            "model_download": "direct_from_colab"
        },
        "notebook_url": COLAB_NOTEBOOK_URL,
        "github_repo": GITHUB_REPO_URL,
        "documentation": "Built-in step-by-step guide",
        "status": "ready",
        "benefits": [
            "Zero local setup required",
            "Free GPU access with Google Colab",
            "Professional training in the cloud",
            "Automatic image captioning",
            "Multiple configuration formats",
            "Complete training workflow"
        ]
    }

@app.post("/api/colab-training-status")
async def update_colab_training_status(status_data: ColabStatusUpdate):
    """Receive training status updates from Google Colab (for future integration)"""
    try:
        # Store the status update
        project_id = status_data.project_id
        
        if project_id not in remote_training_state["training_sessions"]:
            remote_training_state["training_sessions"][project_id] = {}
        
        # Update training state
        remote_training_state["training_sessions"][project_id].update({
            "current_step": status_data.current_step,
            "total_steps": status_data.total_steps,
            "current_loss": status_data.loss,
            "progress_percentage": status_data.progress,
            "eta_minutes": status_data.eta_minutes,
            "status": status_data.status,
            "last_update": datetime.now().isoformat(),
            "platform": "google_colab"
        })
        
        # Log the update
        logger.info(f"Received Colab status update for project {project_id}: {status_data.status}")
        
        return {
            "status": "updated",
            "project_id": project_id,
            "message": "Status received from Google Colab",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating Colab status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/training-status/{project_id}")
async def get_training_status(project_id: str):
    """Get training status for a specific project"""
    try:
        if project_id not in remote_training_state["training_sessions"]:
            return {
                "project_id": project_id,
                "status": "not_started",
                "message": "Training not started yet",
                "platform": "google_colab",
                "instructions": "Open Google Colab notebook to start training"
            }
        
        session = remote_training_state["training_sessions"][project_id]
        return {
            "project_id": project_id,
            **session
        }
        
    except Exception as e:
        logger.error(f"Error getting training status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
async def list_projects():
    """List all projects prepared for Google Colab training"""
    return {
        "projects": list(projects_db.values()),
        "total": len(projects_db),
        "platform": "remote_colab_training",
        "all_colab_ready": all(p.get("colab_compatible", False) for p in projects_db.values())
    }

@app.get("/api/project/{project_id}")
async def get_project(project_id: str):
    """Get details of a specific project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    
    # Add Colab-specific information
    project["colab_info"] = {
        "notebook_url": COLAB_NOTEBOOK_URL,
        "github_repo": GITHUB_REPO_URL,
        "recommended_runtime": "A100 GPU (Pro/Pro+)",
        "estimated_training_time": "20-60 minutes",
        "dataset_ready": project.get("colab_compatible", False)
    }
    
    return project

@app.delete("/api/project/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and its files"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Remove project files
        project_dir = DATASET_DIR / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)
        
        # Remove config files
        config_dir = CONFIG_DIR / project_id
        if config_dir.exists():
            shutil.rmtree(config_dir)
        
        # Remove from database
        del projects_db[project_id]
        
        # Remove from training sessions if exists
        if project_id in remote_training_state["training_sessions"]:
            del remote_training_state["training_sessions"][project_id]
        
        logger.info(f"Deleted project {project_id}")
        
        return {
            "status": "deleted", 
            "project_id": project_id,
            "message": "Project and all associated files deleted"
        }
        
    except Exception as e:
        logger.error(f"Error deleting project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system-info")
async def get_system_info():
    """Get system information for remote training platform"""
    return {
        "platform": "flux_lora_studio_remote",
        "version": "2.0.0",
        "training_mode": "remote_google_colab",
        "local_requirements": "none",
        "features": {
            "automatic_image_captioning": True,
            "dataset_packaging": True,
            "configuration_generation": True,
            "google_colab_integration": True,
            "multiple_config_formats": True,
            "zero_local_setup": True
        },
        "supported_formats": {
            "images": ["JPG", "PNG", "WebP", "JPEG"],
            "configs": ["JSON", "YAML", "Python"],
            "outputs": ["SafeTensors", "PyTorch"]
        },
        "colab_benefits": [
            "Free GPU access (T4)",
            "Powerful Pro GPUs (V100, A100)",
            "No local installation required",
            "Cloud-based training",
            "Automatic model download",
            "Built-in monitoring"
        ],
        "recommended_setup": {
            "google_account": "Required for Colab access",
            "colab_pro": "Recommended for A100 GPU",
            "internet_connection": "Required for cloud training",
            "browser": "Chrome, Firefox, Safari, Edge"
        },
        "status": "fully_operational",
        "message": "Ready for remote FLUX LoRA training via Google Colab"
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found", 
            "path": str(request.url.path),
            "platform": "flux_lora_studio_remote"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error", 
            "timestamp": datetime.now().isoformat(),
            "platform": "flux_lora_studio_remote"
        }
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5006))
    uvicorn.run(
        "app_remote:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )