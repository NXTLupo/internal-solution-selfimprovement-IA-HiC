"""
FLUX LoRA Studio - Professional AI Model Training for Generative Content Creation
FastAPI backend with comprehensive training pipeline for FLUX LoRA models
"""

import os
import json
import uuid
import shutil
import asyncio
import logging
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
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

# Import our FLUX training module
try:
    from src.flux_trainer import FluxLoRATrainer, FluxTrainingConfig, check_training_requirements
    TRAINING_AVAILABLE = True
except ImportError as e:
    logger.error(f"❌ CRITICAL: Training dependencies not installed: {e}")
    logger.error(f"❌ Run: python install_training_deps.py")
    TRAINING_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# App configuration
app = FastAPI(
    title="FLUX LoRA Studio",
    description="Professional AI Model Training for Generative Content Creation",
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
MODEL_DIR = BASE_DIR / "models"
LOG_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
for directory in [UPLOAD_DIR, DATASET_DIR, MODEL_DIR, LOG_DIR]:
    directory.mkdir(exist_ok=True)

# A11y Image Captioner Service Configuration
IMAGE_CAPTIONER_URL = os.environ.get('IMAGE_CAPTIONER_URL', 'http://image-captioner:5005')
# For local development, use localhost
if 'localhost' in os.environ.get('IMAGE_CAPTIONER_CLIENT_URL', ''):
    IMAGE_CAPTIONER_URL = 'http://localhost:5005'

# Global training state
training_state = {
    "is_training": False,
    "current_step": 0,
    "total_steps": 1000,
    "current_loss": 0.0,
    "eta_minutes": 0,
    "project_name": "",
    "status": "idle",
    "log_messages": [],
    "progress_percentage": 0,
    "gpu_available": False,
    "training_requirements": {}
}

# Global trainer instance
current_trainer = None

# Data models
class TrainingConfig(BaseModel):
    project_name: str
    trigger_word: str
    base_model: str = "flux1-dev"
    train_steps: int = 1000
    learning_rate: float = 1e-4
    batch_size: int = 1
    lora_rank: int = 16
    generate_samples: bool = False
    sample_every_n_steps: Optional[int] = 100
    sample_prompts: Optional[List[str]] = []
    sample_image_size: str = "768x768"
    output_format: str = "safetensors"
    upload_hf: bool = False
    hf_repo: Optional[str] = None

class SampleConfig(BaseModel):
    prompt: str = "a beautiful landscape"
    seed: int = 42
    steps: int = 20
    trigger_word: Optional[str] = None

# In-memory storage for projects
projects_db = {}

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
    """Serve the main FLUX LoRA Studio interface"""
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
            <title>FLUX LoRA Studio</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #121B26; color: white; }
                .container { max-width: 800px; margin: 0 auto; text-align: center; }
                h1 { color: #01C4C8; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎨 FLUX LoRA Studio</h1>
                <p>Professional AI Model Training for Generative Content Creation</p>
                <p>Frontend template loading...</p>
            </div>
        </body>
        </html>
        """)

@app.get("/health")
async def health_check():
    """Health check endpoint with training readiness"""
    requirements = {}
    can_train = False
    
    if TRAINING_AVAILABLE:
        requirements = check_training_requirements()
        can_train = requirements.get("cuda", False)
    
    return {
        "status": "healthy",
        "service": "flux-lora-studio", 
        "timestamp": datetime.now().isoformat(),
        "training_ready": can_train,
        "dependencies_installed": TRAINING_AVAILABLE,
        "gpu_available": requirements.get("cuda", False)
    }

@app.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload training images for LoRA fine-tuning with automatic caption generation"""
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
                "caption_generated": caption_result.get("caption", "") != ""
            }
            
            uploaded_files.append(file_info)
            
            # Also create a .txt file with the caption for training
            if caption_result.get("caption"):
                caption_file = project_dir / f"{file.filename.rsplit('.', 1)[0]}.txt"
                with open(caption_file, "w", encoding="utf-8") as caption_f:
                    caption_f.write(caption_result["caption"])
        
        # Store project metadata
        projects_db[project_id] = {
            "id": project_id,
            "created_at": datetime.now().isoformat(),
            "files": uploaded_files,
            "status": "uploaded",
            "captions_generated": True
        }
        
        logger.info(f"Uploaded {len(files)} files with auto-generated captions for project {project_id}")
        
        return {
            "project_id": project_id,
            "uploaded_files": len(files),
            "files": uploaded_files,
            "status": "success",
            "captions_generated": True
        }
        
    except Exception as e:
        logger.error(f"Error uploading images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-captions")
async def upload_captions(project_id: str = Form(...), files: List[UploadFile] = File(...)):
    """Upload caption files for training images"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_dir = DATASET_DIR / project_id
        captions = []
        
        for file in files:
            if not file.filename.endswith('.txt'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} is not a text file")
            
            file_path = project_dir / file.filename
            content = await file.read()
            
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            
            captions.append({
                "filename": file.filename,
                "content": content.decode('utf-8')[:100] + "..." if len(content) > 100 else content.decode('utf-8')
            })
        
        # Update project metadata
        projects_db[project_id]["captions"] = captions
        
        logger.info(f"Uploaded {len(files)} caption files for project {project_id}")
        
        return {
            "project_id": project_id,
            "uploaded_captions": len(files),
            "captions": captions,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error uploading captions: {str(e)}")
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
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"Error updating caption: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-training")
async def start_training(config: TrainingConfig, background_tasks: BackgroundTasks):
    """Start LoRA training with the provided configuration"""
    try:
        # Check if training dependencies are available
        if not TRAINING_AVAILABLE:
            raise HTTPException(
                status_code=503, 
                detail="Training dependencies not installed. Run: python install_training_deps.py"
            )
        
        # Check if GPU is available (CUDA or MPS)
        requirements = check_training_requirements()
        gpu_available = requirements.get("cuda", False) or requirements.get("mps", False)
        
        if not gpu_available:
            device_msg = "GPU required for FLUX LoRA training. "
            try:
                import torch
                if torch.backends.mps.is_available():
                    device_msg += "Apple Silicon MPS detected but not working properly."
                else:
                    device_msg += "No CUDA or MPS device detected."
            except ImportError:
                device_msg += "PyTorch not installed."
            
            raise HTTPException(
                status_code=503,
                detail=device_msg
            )
        
        if training_state["is_training"]:
            raise HTTPException(status_code=400, detail="Training already in progress")
        
        # Update training state
        training_state.update({
            "is_training": True,
            "current_step": 0,
            "total_steps": config.train_steps,
            "current_loss": 0.0,
            "eta_minutes": config.train_steps // 2,  # More realistic estimate
            "project_name": config.project_name,
            "status": "starting",
            "log_messages": [],
            "progress_percentage": 0
        })
        
        # Log training start
        log_message = f"Starting REAL LoRA training: {config.project_name} (trigger: '{config.trigger_word}')"
        training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {log_message}")
        
        # Log configuration details
        config_details = [
            f"Base Model: {config.base_model}",
            f"Steps: {config.train_steps}",
            f"Learning Rate: {config.learning_rate}",
            f"LoRA Rank: {config.lora_rank}",
            f"Batch Size: {config.batch_size}",
            f"GPU: {requirements.get('gpu_name', 'CUDA GPU')}"
        ]
        
        if config.generate_samples:
            config_details.append(f"Sample Generation: Every {config.sample_every_n_steps} steps")
            config_details.append(f"Sample Prompts: {len(config.sample_prompts)} prompts")
        
        for detail in config_details:
            training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {detail}")
        
        logger.info(log_message)
        
        # Start training in background
        background_tasks.add_task(start_training_process, config, "project_id")
        
        return {
            "status": "training_started",
            "project_name": config.project_name,
            "total_steps": config.train_steps,
            "message": "Real FLUX LoRA training started successfully"
        }
        
    except Exception as e:
        logger.error(f"Error starting training: {str(e)}")
        training_state["is_training"] = False
        raise HTTPException(status_code=500, detail=str(e))

def progress_callback(step: int, total_steps: int, loss: float):
    """Callback function for training progress updates"""
    training_state["current_step"] = step
    training_state["progress_percentage"] = (step / total_steps) * 100
    training_state["current_loss"] = loss
    training_state["eta_minutes"] = max(0, (total_steps - step) * 0.5 / 60)  # Estimate 0.5 seconds per step
    
    # Add log messages periodically (for remote training status updates)
    if step % 10 == 0 or step == total_steps:
        log_message = f"Colab Step {step}/{total_steps}: Loss {loss:.4f}"
        training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {log_message}")
        
        # Keep only last 50 log messages
        if len(training_state["log_messages"]) > 50:
            training_state["log_messages"] = training_state["log_messages"][-50:]

def run_real_training(config: TrainingConfig, project_id: str):
    """Run real FLUX LoRA training in a separate thread"""
    global current_trainer
    
    try:
        training_state["status"] = "initializing"
        training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Initializing FLUX LoRA training...")
        
        # Convert to training config
        flux_config = FluxTrainingConfig(
            project_name=config.project_name,
            trigger_word=config.trigger_word,
            base_model=config.base_model,
            train_steps=config.train_steps,
            learning_rate=config.learning_rate,
            batch_size=config.batch_size,
            lora_rank=config.lora_rank,
            resolution=512,
            output_dir=str(MODEL_DIR),
            dataset_path=str(DATASET_DIR / project_id)
        )
        
        # Create trainer
        current_trainer = FluxLoRATrainer(flux_config)
        
        # Setup training
        training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Setting up training environment...")
        if not current_trainer.setup_training():
            raise Exception("Failed to setup training environment")
        
        training_state["status"] = "training"
        training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Starting training...")
        
        # Start training
        current_trainer.start_training()
        success = current_trainer.train(progress_callback=progress_callback)
        
        if success:
            training_state.update({
                "is_training": False,
                "status": "completed",
                "progress_percentage": 100
            })
            
            completion_message = f"Training completed for {config.project_name}!"
            training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {completion_message}")
            training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Use trigger word '{config.trigger_word}' in prompts")
            logger.info(completion_message)
        else:
            raise Exception("Training failed")
            
    except Exception as e:
        logger.error(f"Error in training process: {str(e)}")
        training_state.update({
            "is_training": False,
            "status": "error",
            "log_messages": training_state["log_messages"] + [f"[{datetime.now().strftime('%H:%M:%S')}] Error: {str(e)}"]
        })
    finally:
        current_trainer = None

async def start_training_process(config: TrainingConfig, project_id: str):
    """Start the real training process - NO DEMO MODE"""
    global current_trainer
    
    # Only allow real training
    if not TRAINING_AVAILABLE:
        training_state.update({
            "is_training": False,
            "status": "error",
            "log_messages": training_state["log_messages"] + [f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Training dependencies not installed"]
        })
        return
    
    if not training_state["gpu_available"]:
        training_state.update({
            "is_training": False,
            "status": "error", 
            "log_messages": training_state["log_messages"] + [f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: CUDA GPU required for training"]
        })
        return
    
    # Run real training in a separate thread
    training_thread = threading.Thread(
        target=run_real_training, 
        args=(config, project_id),
        daemon=True
    )
    training_thread.start()

# NO DEMO MODE - Real training only

@app.post("/api/pause-training")
async def pause_training():
    """Pause the current training process"""
    if not training_state["is_training"]:
        raise HTTPException(status_code=400, detail="No training in progress")
    
    training_state["status"] = "paused"
    training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Training paused")
    
    return {"status": "paused", "message": "Training paused successfully"}

@app.post("/api/stop-training")
async def stop_training():
    """Stop the current training process"""
    global current_trainer
    
    if not training_state["is_training"]:
        raise HTTPException(status_code=400, detail="No training in progress")
    
    # Stop real trainer if available
    if current_trainer:
        current_trainer.stop_training()
    
    training_state.update({
        "is_training": False,
        "status": "stopped"
    })
    training_state["log_messages"].append(f"[{datetime.now().strftime('%H:%M:%S')}] Training stopped")
    
    return {"status": "stopped", "message": "Training stopped successfully"}

@app.get("/api/training-status")
async def get_training_status():
    """Get current training status and metrics"""
    return {
        "is_training": training_state["is_training"],
        "status": training_state["status"],
        "current_step": training_state["current_step"],
        "total_steps": training_state["total_steps"],
        "progress_percentage": training_state["progress_percentage"],
        "current_loss": training_state["current_loss"],
        "eta_minutes": training_state["eta_minutes"],
        "project_name": training_state["project_name"],
        "log_messages": training_state["log_messages"][-20:],  # Last 20 messages
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/generate-sample")
async def generate_sample(config: SampleConfig):
    """Generate a sample image using the current model state"""
    try:
        # Simulate image generation
        sample_id = str(uuid.uuid4())
        
        # Create a placeholder for the generated image
        sample_data = {
            "id": sample_id,
            "prompt": config.prompt,
            "seed": config.seed,
            "steps": config.steps,
            "generated_at": datetime.now().isoformat(),
            "status": "generated",
            "image_url": f"/api/sample-image/{sample_id}"
        }
        
        logger.info(f"Generated sample image with prompt: {config.prompt}")
        
        return sample_data
        
    except Exception as e:
        logger.error(f"Error generating sample: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sample-image/{sample_id}")
async def get_sample_image(sample_id: str):
    """Get a generated sample image"""
    # For now, return a placeholder response
    # In a real implementation, this would return the actual generated image
    return {"message": "Sample image placeholder", "sample_id": sample_id}

@app.get("/api/projects")
async def list_projects():
    """List all training projects"""
    return {
        "projects": list(projects_db.values()),
        "total": len(projects_db)
    }

@app.get("/api/project/{project_id}")
async def get_project(project_id: str):
    """Get details of a specific project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return projects_db[project_id]

@app.delete("/api/project/{project_id}")
async def delete_project(project_id: str):
    """Delete a training project and its files"""
    try:
        if project_id not in projects_db:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Remove project files
        project_dir = DATASET_DIR / project_id
        if project_dir.exists():
            shutil.rmtree(project_dir)
        
        # Remove from database
        del projects_db[project_id]
        
        logger.info(f"Deleted project {project_id}")
        
        return {"status": "deleted", "project_id": project_id}
        
    except Exception as e:
        logger.error(f"Error deleting project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def list_models():
    """List all trained models"""
    try:
        models = []
        if MODEL_DIR.exists():
            for model_file in MODEL_DIR.iterdir():
                if model_file.is_file():
                    stat = model_file.stat()
                    models.append({
                        "filename": model_file.name,
                        "size": stat.st_size,
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "download_url": f"/api/download-model/{model_file.name}"
                    })
        
        return {"models": models, "total": len(models)}
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download-model/{filename}")
async def download_model(filename: str):
    """Download a trained model file"""
    try:
        model_path = MODEL_DIR / filename
        if not model_path.exists():
            raise HTTPException(status_code=404, detail="Model file not found")
        
        return FileResponse(
            path=model_path,
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"Error downloading model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system-info")
async def get_system_info():
    """Get system information and training requirements"""
    try:
        # Check training requirements
        requirements = {}
        gpu_available = False
        gpu_info = "No GPU detected"
        
        if TRAINING_AVAILABLE:
            requirements = check_training_requirements()
            gpu_available = requirements.get("cuda", False) or requirements.get("mps", False)
            
            if gpu_available:
                try:
                    import torch
                    if torch.cuda.is_available():
                        gpu_name = torch.cuda.get_device_name(0)
                        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                        gpu_info = f"CUDA: {gpu_name} ({gpu_memory:.1f}GB)"
                    elif torch.backends.mps.is_available():
                        # Apple Silicon detection
                        import platform
                        if platform.processor() == 'arm':
                            gpu_info = "Apple Silicon MPS (GPU acceleration enabled)"
                        else:
                            gpu_info = "MPS available but not Apple Silicon"
                    else:
                        gpu_info = "GPU detection inconsistent"
                except:
                    gpu_info = "GPU detection failed"
        
        # Update global training state
        training_state["gpu_available"] = gpu_available
        training_state["training_requirements"] = requirements
        
        system_info = {
            "training_available": TRAINING_AVAILABLE,
            "gpu_available": gpu_available,
            "gpu_info": gpu_info,
            "requirements": requirements,
            "training_mode": "Real Training" if (TRAINING_AVAILABLE and gpu_available) else "REQUIREMENTS NOT MET",
            "dependencies_installed": TRAINING_AVAILABLE,
            "can_train": TRAINING_AVAILABLE and gpu_available,
            "setup_required": not (TRAINING_AVAILABLE and gpu_available),
            "recommended_setup": {
                "gpu_memory_gb": "12+ GB VRAM required",
                "system_memory_gb": "16+ GB RAM required", 
                "disk_space_gb": "10+ GB free space required",
                "python_version": "Python 3.9+ required",
                "cuda_version": "CUDA 11.8+ or 12.x required"
            }
        }
        
        return system_info
        
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint not found", "path": str(request.url.path)}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "timestamp": datetime.now().isoformat()}
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5006))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )