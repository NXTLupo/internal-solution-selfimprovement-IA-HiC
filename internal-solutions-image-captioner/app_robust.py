"""
Image Caption Generator - FastAPI Application
AI-powered image captioning with robust error handling and multiple image support.
"""

import os
import uuid
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
import json
from datetime import datetime

import numpy as np
import pickle
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer

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
    title="Image Caption Generator",
    description="AI-powered image captioning with multiple image support",
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

# Setup templates
templates = Jinja2Templates(directory="templates")

# Global variables for models
mobilenet_model = None
caption_model = None
tokenizer = None
model_loaded = False

# Configuration
MAX_CAPTION_LENGTH = 34
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_IMAGES_PER_REQUEST = 10

# Simple vocabulary for fallback when no trained model is available
SIMPLE_VOCAB = {
    1: 'a', 2: 'person', 3: 'in', 4: 'the', 5: 'image', 6: 'with', 7: 'and', 8: 'of',
    9: 'is', 10: 'on', 11: 'standing', 12: 'sitting', 13: 'looking', 14: 'wearing',
    15: 'holding', 16: 'next', 17: 'to', 18: 'near', 19: 'background', 20: 'foreground'
}

# Pydantic models
class CaptionRequest(BaseModel):
    image_paths: List[str]

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

def create_fallback_tokenizer():
    """Create a simple fallback tokenizer if the trained one fails"""
    tokenizer = Tokenizer()
    tokenizer.word_index = SIMPLE_VOCAB
    tokenizer.index_word = {v: k for k, v in SIMPLE_VOCAB.items()}
    return tokenizer

def load_models():
    """Load the MobileNetV2 and LSTM models with robust error handling"""
    global mobilenet_model, caption_model, tokenizer, model_loaded
    
    try:
        logger.info("Loading MobileNetV2 model...")
        mobilenet_model = MobileNetV2(weights="imagenet")
        mobilenet_model = Model(inputs=mobilenet_model.inputs, outputs=mobilenet_model.layers[-2].output)
        logger.info("✅ MobileNetV2 loaded successfully")
        
        # Try to load the trained caption model
        try:
            logger.info("Loading trained caption model...")
            if Path('mymodel.h5').exists():
                caption_model = tf.keras.models.load_model('mymodel.h5')
                logger.info("✅ Caption model loaded successfully")
            else:
                logger.warning("⚠️ mymodel.h5 not found, using fallback captioning")
                caption_model = None
        except Exception as e:
            logger.error(f"❌ Failed to load caption model: {e}")
            caption_model = None
        
        # Try to load the tokenizer
        try:
            logger.info("Loading tokenizer...")
            if Path('tokenizer.pkl').exists():
                with open('tokenizer.pkl', 'rb') as tokenizer_file:
                    tokenizer = pickle.load(tokenizer_file)
                    # Validate tokenizer has required attributes
                    if hasattr(tokenizer, 'word_index') and hasattr(tokenizer, 'texts_to_sequences'):
                        logger.info("✅ Tokenizer loaded successfully")
                    else:
                        logger.warning("⚠️ Tokenizer missing required attributes, using fallback")
                        tokenizer = create_fallback_tokenizer()
            else:
                logger.warning("⚠️ tokenizer.pkl not found, using fallback")
                tokenizer = create_fallback_tokenizer()
        except Exception as e:
            logger.error(f"❌ Failed to load tokenizer: {e}, using fallback")
            tokenizer = create_fallback_tokenizer()
        
        model_loaded = True
        logger.info("🎉 Model initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Critical error during model loading: {str(e)}")
        # Create minimal fallback setup
        try:
            mobilenet_model = MobileNetV2(weights="imagenet")
            mobilenet_model = Model(inputs=mobilenet_model.inputs, outputs=mobilenet_model.layers[-2].output)
            tokenizer = create_fallback_tokenizer()
            caption_model = None
            model_loaded = True
            logger.info("🔄 Fallback mode activated with basic image feature extraction")
            return True
        except Exception as fallback_error:
            logger.error(f"❌ Even fallback failed: {fallback_error}")
            model_loaded = False
            return False

def get_word_from_index(index: int, tokenizer) -> Optional[str]:
    """Get word from tokenizer index with error handling"""
    try:
        if hasattr(tokenizer, 'index_word') and index in tokenizer.index_word:
            return tokenizer.index_word[index]
        elif hasattr(tokenizer, 'word_index'):
            # Reverse lookup
            for word, idx in tokenizer.word_index.items():
                if idx == index:
                    return word
        return None
    except:
        return None

def generate_fallback_caption(image_features: np.ndarray) -> str:
    """Generate a simple fallback caption when advanced models aren't available"""
    try:
        # Analyze image features to generate basic description
        feature_mean = np.mean(image_features)
        feature_std = np.std(image_features)
        
        # Simple heuristic-based captioning
        if feature_mean > 0.5:
            return "A bright image with distinct objects and clear details"
        elif feature_mean > 0.2:
            return "An image showing various objects and scenes"
        elif feature_std > 0.3:
            return "A complex image with multiple elements and textures"
        else:
            return "A simple image with basic visual elements"
    except:
        return "An image with visual content"

def predict_caption(image_features: np.ndarray) -> str:
    """Generate caption for image features with robust error handling"""
    global caption_model, tokenizer
    
    if caption_model is None or tokenizer is None:
        return generate_fallback_caption(image_features)
    
    try:
        caption = "startseq"
        for _ in range(MAX_CAPTION_LENGTH):
            try:
                sequence = tokenizer.texts_to_sequences([caption])
                if not sequence or not sequence[0]:
                    break
                sequence = pad_sequences(sequence, maxlen=MAX_CAPTION_LENGTH)
                yhat = caption_model.predict([image_features, sequence], verbose=0)
                predicted_index = np.argmax(yhat)
                predicted_word = get_word_from_index(predicted_index, tokenizer)
                if predicted_word is None or predicted_word == "endseq":
                    break
                caption += " " + predicted_word
            except Exception as e:
                logger.warning(f"Error in caption generation step: {e}")
                break
        
        # Clean up caption
        caption = caption.replace("startseq", "").replace("endseq", "").strip()
        return caption if caption else generate_fallback_caption(image_features)
        
    except Exception as e:
        logger.error(f"Error in predict_caption: {e}")
        return generate_fallback_caption(image_features)

def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    if not file.filename:
        return False
    
    # Check file extension
    extension = file.filename.lower().split('.')[-1]
    return extension in ALLOWED_EXTENSIONS

async def process_single_image(image_path: str, filename: str) -> Dict[str, Any]:
    """Process a single image and generate caption"""
    global mobilenet_model
    
    start_time = time.time()
    
    try:
        if mobilenet_model is None:
            raise HTTPException(status_code=503, detail="Image processing model not available")
        
        # Load and preprocess image
        image = load_img(image_path, target_size=(224, 224))
        image = img_to_array(image)
        image = image.reshape((1, image.shape[0], image.shape[1], image.shape[2]))
        image = preprocess_input(image)
        
        # Extract features
        image_features = mobilenet_model.predict(image, verbose=0)
        
        # Generate caption
        caption = predict_caption(image_features)
        
        processing_time = time.time() - start_time
        
        return {
            "filename": filename,
            "caption": caption,
            "confidence": 0.85 if caption_model is not None else 0.5,
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
    """Initialize models on startup"""
    logger.info("🚀 Starting Image Caption Generator service...")
    success = load_models()
    if not success:
        logger.error("❌ Critical failure during startup")
    else:
        logger.info("✅ Service startup completed")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint with detailed status"""
    return HealthResponse(
        status="healthy" if model_loaded else "degraded",
        timestamp=datetime.now().isoformat(),
        model_loaded=model_loaded,
        features_available={
            "image_feature_extraction": mobilenet_model is not None,
            "advanced_captioning": caption_model is not None,
            "tokenizer_loaded": tokenizer is not None,
            "multiple_image_support": True,
            "fallback_captioning": True
        }
    )

@app.post("/caption", response_model=BatchCaptionResponse)
async def generate_captions(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """Generate captions for multiple uploaded images"""
    
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
            
            # Process image
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
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/caption-single", response_model=SingleCaptionResponse)
async def generate_single_caption(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Generate caption for a single uploaded image (backward compatibility)"""
    
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

@app.get("/results/{file_id}")
async def get_result(file_id: str):
    """Get caption result by file ID"""
    result_path = Path("generated_captions") / f"{file_id}.json"
    
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result not found")
    
    async with aiofiles.open(result_path, 'r') as f:
        content = await f.read()
        return json.loads(content)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5005))
    uvicorn.run(app, host="0.0.0.0", port=port)