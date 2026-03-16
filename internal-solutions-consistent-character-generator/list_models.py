#!/usr/bin/env python3
"""
List available Gemini models to find the correct model names
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Configure with API key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in environment")
    exit(1)

client = genai.Client(api_key=api_key)

print("=" * 80)
print("AVAILABLE GEMINI MODELS")
print("=" * 80)

# List all available models
try:
    models = client.models.list()
    
    image_models = []
    video_models = []
    
    for model in models:
        print(f"\nModel: {model.name}")
        if hasattr(model, 'display_name'):
            print(f"Display Name: {model.display_name}")
        if hasattr(model, 'description'):
            print(f"Description: {model.description}")
        
        # Show supported methods
        if hasattr(model, 'supported_generation_methods'):
            print(f"Supported Methods: {model.supported_generation_methods}")
            
            # Check specific method support
            if 'generateContent' in model.supported_generation_methods:
                print("  [OK] generateContent - Can generate text/content")
            if 'generateImage' in model.supported_generation_methods:
                print("  [OK] generateImage - Can generate images")
            if 'generateVideo' in model.supported_generation_methods:
                print("  [OK] generateVideo - Can generate videos")
        
        # Check model capabilities based on name
        model_id = model.name.split('/')[-1] if '/' in model.name else model.name
        
        # Check for image generation capabilities
        if 'imagen' in model_id.lower() or 'image' in model_id.lower() or 'nano-banana' in model_id.lower():
            print("  IMAGE GENERATION MODEL")
            image_models.append((model_id, getattr(model, 'supported_generation_methods', [])))
        
        # Check for video generation capabilities
        if 'veo' in model_id.lower() or 'video' in model_id.lower():
            print("  VIDEO GENERATION MODEL")
            video_models.append((model_id, getattr(model, 'supported_generation_methods', [])))
        
        print("-" * 40)
    
    print("\n" + "=" * 80)
    print("MODELS SUITABLE FOR IMAGE GENERATION:")
    print("=" * 80)
    for model, methods in image_models:
        print(f"- {model}")
    
    print("\n" + "=" * 80)
    print("MODELS SUITABLE FOR VIDEO GENERATION:")
    print("=" * 80)
    for model, methods in video_models:
        print(f"- {model}")
        
    # Also try to list Imagen and Veo models specifically
    print("\n" + "=" * 80)
    print("TESTING SPECIFIC MODEL NAMES:")
    print("=" * 80)
    
    test_models = [
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash-thinking-exp",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "imagen-3.0-generate-001",
        "imagen-3.0-fast-generate-001",
        "veo-001-preview",
        "veo-3.1-fast-generate-preview"
    ]
    
    for model_name in test_models:
        try:
            # Try to use the model to see if it exists
            response = client.models.generate_content(
                model=model_name,
                contents="Test",
                config=types.GenerateContentConfig(
                    max_output_tokens=1,
                    stop_sequences=["x"]
                )
            )
            print(f"[OK] {model_name} - AVAILABLE")
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                print(f"[X] {model_name} - NOT FOUND")
            else:
                print(f"? {model_name} - ERROR: {str(e)[:50]}")

except Exception as e:
    print(f"Error listing models: {e}")