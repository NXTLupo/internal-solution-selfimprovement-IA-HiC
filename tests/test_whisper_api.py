#!/usr/bin/env python3
"""
Script to test the OpenAI Whisper API integration
"""
import os
import sys
import json
import asyncio
import argparse
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("test-whisper-api")

async def test_whisper_api():
    """Test the OpenAI Whisper API integration"""
    try:
        # Import the module dynamically
        sys.path.append(str(Path(__file__).parent / "internal-solutions-video-analyzer"))
        
        from src.transcription.openai_whisper_api import transcribe_audio_with_api
        
        # Check if OpenAI API key is set
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY environment variable is not set")
            print("Error: OPENAI_API_KEY environment variable is not set")
            print("Please set it with: export OPENAI_API_KEY=your_api_key")
            return False
        
        # Clean the API key
        api_key = api_key.strip()
        if '\n' in api_key:
            logger.warning("API key contains newlines, cleaning...")
            api_key = api_key.split('\n')[0].strip()
            os.environ["OPENAI_API_KEY"] = api_key
        
        print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")
        
        # Check if a test audio file exists
        test_file = Path(__file__).parent / "test_audio.mp3"
        if not test_file.exists():
            logger.error(f"Test audio file not found: {test_file}")
            print(f"Error: Test audio file not found: {test_file}")
            print("Please provide a test audio file named 'test_audio.mp3' in the current directory")
            return False
        
        print(f"Testing OpenAI Whisper API with file: {test_file}")
        print("This may take a moment...")
        
        # Perform the transcription
        result = await transcribe_audio_with_api(str(test_file))
        
        # Print the result
        print("\n--- Transcription Result ---")
        print(f"Text: {result.text[:500]}...")
        print(f"Language: {result.language}")
        print(f"Segments: {len(result.segments)}")
        print("\nFirst few segments:")
        for segment in result.segments[:3]:
            print(f"  {segment.start:.2f}s - {segment.end:.2f}s: {segment.text}")
        
        print("\n✅ Whisper API test successful!")
        return True
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        print(f"Error: Could not import required modules: {e}")
        print("Make sure you're running this script from the correct directory")
        return False
    except Exception as e:
        logger.error(f"Error testing Whisper API: {e}")
        print(f"❌ Error testing Whisper API: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test OpenAI Whisper API integration")
    parser.add_argument("--key", "-k", help="OpenAI API key (can also be set as OPENAI_API_KEY environment variable)")
    args = parser.parse_args()
    
    # Set API key if provided
    if args.key:
        os.environ["OPENAI_API_KEY"] = args.key
        print(f"Using provided OpenAI API key: {args.key[:5]}...{args.key[-5:]}")
    
    # Run the test
    result = asyncio.run(test_whisper_api())
    
    # Exit with appropriate code
    if result:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()