#!/usr/bin/env python3
"""Create a replacement for the transcribe_with_whisper function in app.py"""

import os
import logging
import json
from openai import OpenAI

# Set API key directly
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["USE_WHISPER_API"] = "true"

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("video-analyzer.new_transcribe")

class WhisperResponse:
    """Response structure for Whisper API results"""
    class Segment:
        def __init__(self, start, end, text):
            self.start = start
            self.end = end
            self.text = text
    
    def __init__(self, text):
        self.text = text
        self.segments = []

async def transcribe_with_whisper(audio_file_path):
    """Transcribe audio using OpenAI Whisper API (fixed version)"""
    logger.info(f"Transcribing audio using fixed Whisper API function")
    
    # Log API key status
    masked_key = f"{OPENAI_API_KEY[:8]}...{OPENAI_API_KEY[-4:]}" if len(OPENAI_API_KEY) > 12 else "[INVALID KEY]"
    logger.info(f"Using API key: {masked_key} (length: {len(OPENAI_API_KEY)})")
    
    try:
        # Initialize OpenAI client directly with API key
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Open the audio file
        with open(audio_file_path, "rb") as audio_file:
            # Call Whisper API for transcription
            response = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language="en",
                response_format="verbose_json",
                timestamp_granularities=["segment", "word"]
            )
            
            # Convert to our expected format
            result = WhisperResponse(response.text)
            
            # Add segments
            for segment in response.segments:
                result.segments.append(
                    WhisperResponse.Segment(
                        start=segment.start,
                        end=segment.end,
                        text=segment.text
                    )
                )
            
            logger.info(f"Transcription successful: {len(result.text)} characters")
            return result
            
    except Exception as e:
        logger.error(f"Error transcribing with Whisper API: {str(e)}")
        raise

# Write the function to a file for injection
if __name__ == "__main__":
    print("New transcribe_with_whisper function created successfully")
    print(f"API key: {OPENAI_API_KEY[:8]}...{OPENAI_API_KEY[-4:]}")
    print("This file should be copied to the container")