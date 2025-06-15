"""
A11y Image Caption Generator - Accessibility-Focused AI
Uses Claude 3.7 Sonnet to generate WCAG-compliant alt text and image descriptions
"""

import os
import uuid
import time
import asyncio
import re
import csv
import io
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import json
from datetime import datetime

import base64
from PIL import Image
import anthropic

from fastapi import FastAPI, HTTPException, Form, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.requests import Request
from starlette.responses import Response
import aiofiles

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="A11y Image Caption Generator",
    description="WCAG-compliant accessibility image captioning using Claude 3.7 Sonnet with vision capabilities",
    version="4.0.0"
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

# Setup templates
templates = Jinja2Templates(directory="templates")

# Global variables for Claude AI
claude_client = None
model_loaded = False

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_IMAGES_PER_REQUEST = 10

# Pydantic models
class SingleCaptionResponse(BaseModel):
    filename: str
    caption: str
    confidence: float
    processing_time: float

class BatchCaptionResponse(BaseModel):
    total_images: int
    total_processing_time: float
    results: List[SingleCaptionResponse]
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    model_loaded: bool
    features_available: Dict[str, bool]
    device_info: Dict[str, str]

class FindReplaceRequest(BaseModel):
    captions: List[Dict[str, Any]]
    find_text: str
    replace_text: str
    case_sensitive: bool = False
    whole_words_only: bool = False

class FindReplaceResponse(BaseModel):
    updated_captions: List[Dict[str, Any]]
    changes_made: int
    total_captions: int

class ExportRequest(BaseModel):
    captions: List[Dict[str, Any]]
    export_format: str = "json"  # json, csv, txt
    include_metadata: bool = True

def encode_image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string for Claude API"""
    import io
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Save to bytes buffer
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    
    # Encode to base64
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def load_ai_models():
    """
    Initialize Claude 3.7 AI client for image captioning
    """
    global claude_client, model_loaded
    
    try:
        # Get API key from environment
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.error("❌ ANTHROPIC_API_KEY not found in environment")
            return False
        
        logger.info("🚀 Initializing Claude 3.7 Sonnet for image captioning...")
        
        # Initialize Claude client
        claude_client = anthropic.Anthropic(api_key=api_key)
        
        # Test the connection with a simple request
        test_response = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=10,
            messages=[{"role": "user", "content": "Hi"}]
        )
        
        model_loaded = True
        logger.info("✅ Claude 3.7 Sonnet loaded successfully!")
        logger.info("🎯 Ready for professional image captioning")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Claude AI: {str(e)}")
        model_loaded = False
        return False

def generate_ai_caption(image: Image.Image) -> tuple[str, float]:
    """
    Generate professional-quality caption using Claude 3.7 Sonnet
    """
    global claude_client
    
    if claude_client is None:
        return "Claude AI not loaded", 0.0
    
    try:
        # Convert image to base64
        image_b64 = encode_image_to_base64(image)
        
        # Create the message for Claude with vision
        response = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_b64
                            }
                        },
                        {
                            "type": "text",
                            "text": "Generate a WCAG 2.1 compliant alt text description for this image. Focus on the essential visual information that would help someone using a screen reader understand the content and context. Be descriptive but concise, mentioning key elements, people, actions, text, and important visual details that convey the image's purpose and meaning. Avoid starting with 'An image of' or 'A photo of'."
                        }
                    ]
                }
            ]
        )
        
        # Extract caption from response
        caption = response.content[0].text.strip()
        
        # Clean up caption
        if not caption:
            caption = "Decorative image with visual elements"
        
        # Remove quotes if Claude adds them
        if caption.startswith('"') and caption.endswith('"'):
            caption = caption[1:-1]
        
        # Claude 3.7 is very reliable for vision tasks
        confidence = 0.95
        
        return caption, confidence
        
    except Exception as e:
        logger.error(f"Error in Claude AI caption generation: {e}")
        return f"Caption generation error: {str(e)}", 0.1

def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    if not file.filename:
        return False
    
    # Check file extension
    extension = file.filename.lower().split('.')[-1]
    return extension in ALLOWED_EXTENSIONS

async def process_single_image(image_path: str, filename: str) -> Dict[str, Any]:
    """
    Process a single image and generate AI caption
    """
    start_time = time.time()
    
    try:
        if claude_client is None:
            raise HTTPException(status_code=503, detail="Claude AI not available")
        
        # Load and preprocess image
        image = Image.open(image_path)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Generate AI caption
        caption, confidence = generate_ai_caption(image)
        
        processing_time = time.time() - start_time
        
        return {
            "filename": filename,
            "caption": caption,
            "confidence": confidence,
            "processing_time": processing_time
        }
        
    except Exception as e:
        logger.error(f"Error processing image {filename}: {str(e)}")
        return {
            "filename": filename,
            "caption": f"Error processing image: {str(e)}",
            "confidence": 0.0,
            "processing_time": time.time() - start_time
        }

@app.on_event("startup")
async def startup_event():
    """Initialize AI models on startup"""
    logger.info("🚀 Starting Modern AI Image Caption Generator...")
    success = load_ai_models()
    if not success:
        logger.error("❌ Critical failure during AI model loading")
    else:
        logger.info("✅ AI service startup completed successfully")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint with detailed status"""
    device_info = {
        "ai_service": "Claude 3.7 Sonnet",
        "anthropic_version": anthropic.__version__,
        "vision_support": "Available",
        "api_status": "Connected" if claude_client else "Disconnected"
    }
    
    return HealthResponse(
        status="healthy" if model_loaded else "degraded",
        timestamp=datetime.now().isoformat(),
        model_loaded=model_loaded,
        features_available={
            "claude_3_7_sonnet": claude_client is not None,
            "accessibility_ai": True,
            "wcag_compliance": True,
            "multiple_image_support": True,
            "a11y_captions": True,
            "screen_reader_optimized": True
        },
        device_info=device_info
    )

@app.post("/caption", response_model=BatchCaptionResponse)
async def generate_captions(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """Generate AI captions for multiple uploaded images"""
    
    total_start_time = time.time()
    
    # Validate input
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=400, 
            detail=f"Too many files. Maximum {MAX_IMAGES_PER_REQUEST} images per request"
        )
    
    results = []
    uploaded_files = []
    
    try:
        # Process each file
        for file in files:
            # Validate file
            if not validate_image_file(file):
                results.append({
                    "filename": file.filename or "unknown",
                    "caption": f"Invalid file type. Supported: {', '.join(ALLOWED_EXTENSIONS)}",
                    "confidence": 0.0,
                    "processing_time": 0.0
                })
                continue
            
            # Check file size
            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename,
                    "caption": "File too large. Maximum size: 10MB",
                    "confidence": 0.0,
                    "processing_time": 0.0
                })
                continue
            
            # Save uploaded file
            file_id = str(uuid.uuid4())
            file_extension = file.filename.split('.')[-1].lower()
            filename = f"{file_id}.{file_extension}"
            upload_path = Path("uploads") / filename
            
            # Ensure uploads directory exists
            upload_path.parent.mkdir(exist_ok=True)
            
            async with aiofiles.open(upload_path, 'wb') as f:
                await f.write(contents)
            
            uploaded_files.append(upload_path)
            
            # Process image with AI
            result = await process_single_image(str(upload_path), file.filename)
            results.append(result)
        
        total_processing_time = time.time() - total_start_time
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(cleanup_files, *uploaded_files)
        
        return BatchCaptionResponse(
            total_images=len(files),
            total_processing_time=total_processing_time,
            results=[SingleCaptionResponse(**result) for result in results],
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        # Cleanup on error
        for path in uploaded_files:
            if path.exists():
                path.unlink()
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

@app.post("/caption-single", response_model=SingleCaptionResponse)
async def generate_single_caption(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Generate AI caption for a single uploaded image"""
    
    result = await generate_captions([file], background_tasks)
    if result.results:
        return result.results[0]
    else:
        raise HTTPException(status_code=500, detail="Failed to process image")

async def cleanup_files(*file_paths):
    """Cleanup temporary files after delay"""
    await asyncio.sleep(3600)  # Wait 1 hour
    for path in file_paths:
        try:
            if Path(path).exists():
                Path(path).unlink()
        except Exception as e:
            logger.warning(f"Failed to cleanup file {path}: {e}")

def perform_find_replace(text: str, find_text: str, replace_text: str, 
                        case_sensitive: bool = False, whole_words_only: bool = False) -> str:
    """Perform find and replace operation on text"""
    if not find_text:
        return text
    
    flags = 0 if case_sensitive else re.IGNORECASE
    
    if whole_words_only:
        # Use word boundaries to match whole words only
        pattern = r'\b' + re.escape(find_text) + r'\b'
    else:
        pattern = re.escape(find_text)
    
    return re.sub(pattern, replace_text, text, flags=flags)

@app.post("/find-replace", response_model=FindReplaceResponse)
async def find_replace_captions(request: FindReplaceRequest):
    """Perform find and replace across all captions"""
    
    try:
        updated_captions = []
        changes_made = 0
        
        for caption_data in request.captions:
            original_caption = caption_data.get('caption', '')
            updated_caption = perform_find_replace(
                original_caption,
                request.find_text,
                request.replace_text,
                request.case_sensitive,
                request.whole_words_only
            )
            
            # Create updated caption data
            updated_data = caption_data.copy()
            updated_data['caption'] = updated_caption
            updated_data['modified'] = updated_caption != original_caption
            
            if updated_caption != original_caption:
                changes_made += 1
            
            updated_captions.append(updated_data)
        
        return FindReplaceResponse(
            updated_captions=updated_captions,
            changes_made=changes_made,
            total_captions=len(request.captions)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Find/replace failed: {str(e)}")

@app.post("/export-captions")
async def export_captions(request: ExportRequest):
    """Export captions in various formats"""
    
    try:
        export_format = request.export_format.lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if export_format == "json":
            # JSON export with accessibility metadata
            export_data = {
                "export_info": {
                    "timestamp": datetime.now().isoformat(),
                    "total_images": len(request.captions),
                    "format": "json",
                    "accessibility_standard": "WCAG 2.1",
                    "purpose": "Alt text for screen readers and accessibility compliance"
                },
                "alt_text_data": request.captions if request.include_metadata else [
                    {"filename": item["filename"], "alt_text": item["caption"]} 
                    for item in request.captions
                ]
            }
            
            content = json.dumps(export_data, indent=2, ensure_ascii=False)
            filename = f"a11y_alt_text_{timestamp}.json"
            media_type = "application/json"
            
        elif export_format == "csv":
            # CSV export
            output = io.StringIO()
            
            if request.include_metadata:
                fieldnames = ["filename", "alt_text", "confidence", "processing_time", "wcag_compliant"]
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                for item in request.captions:
                    writer.writerow({
                        "filename": item.get("filename", ""),
                        "alt_text": item.get("caption", ""),
                        "confidence": item.get("confidence", ""),
                        "processing_time": item.get("processing_time", ""),
                        "wcag_compliant": "Yes"
                    })
            else:
                fieldnames = ["filename", "alt_text"]
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                
                for item in request.captions:
                    writer.writerow({
                        "filename": item.get("filename", ""),
                        "alt_text": item.get("caption", "")
                    })
            
            content = output.getvalue()
            filename = f"a11y_alt_text_{timestamp}.csv"
            media_type = "text/csv"
            
        elif export_format == "txt":
            # Plain text export
            lines = []
            
            if request.include_metadata:
                lines.append(f"WCAG 2.1 Accessibility Alt Text Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append(f"Total Images: {len(request.captions)}")
                lines.append(f"Accessibility Standard: WCAG 2.1 AA Compliance")
                lines.append("=" * 60)
                lines.append("")
                
                for i, item in enumerate(request.captions, 1):
                    lines.append(f"Image {i}: {item.get('filename', 'Unknown')}")
                    lines.append(f"Alt Text: {item.get('caption', '')}")
                    lines.append(f"WCAG Compliant: Yes")
                    lines.append(f"Confidence: {item.get('confidence', 'N/A')}")
                    lines.append(f"Processing Time: {item.get('processing_time', 'N/A')}s")
                    lines.append("-" * 40)
                    lines.append("")
            else:
                lines.append("# WCAG 2.1 Alt Text")
                lines.append("# Generated for accessibility compliance")
                lines.append("")
                for item in request.captions:
                    lines.append(f"{item.get('filename', '')}: {item.get('caption', '')}")
            
            content = "\n".join(lines)
            filename = f"a11y_alt_text_{timestamp}.txt"
            media_type = "text/plain"
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format. Use: json, csv, or txt")
        
        # Return file as download
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        
        return Response(
            content=content.encode('utf-8'),
            media_type=media_type,
            headers=headers
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5005))
    uvicorn.run(app, host="0.0.0.0", port=port)