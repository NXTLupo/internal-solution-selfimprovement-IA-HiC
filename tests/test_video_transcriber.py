#!/usr/bin/env python3
"""
Test script for Video Transcriber service.
Attempts to:
1. Send a test video URL to the transcription service
2. Poll for results
3. Report success or failure
"""

import requests
import json
import time
import sys

# Configuration
SERVICE_URL = "http://localhost:5002"
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Short test video
MAX_RETRIES = 15  # Maximum number of status check retries
RETRY_DELAY = 5   # Seconds between retries

def submit_transcription_job():
    """Submit a transcription job with a YouTube URL."""
    print(f"Submitting transcription job for: {TEST_YOUTUBE_URL}")
    
    try:
        response = requests.post(
            f"{SERVICE_URL}/analyze-youtube",
            json={"url": TEST_YOUTUBE_URL}
        )
        response.raise_for_status()
        result = response.json()
        print(f"Job submitted successfully. Job ID: {result.get('job_id')}")
        return result.get('job_id')
    except requests.RequestException as e:
        print(f"Error submitting job: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return None

def check_transcription_status(job_id):
    """Check the status of a transcription job."""
    try:
        response = requests.get(f"{SERVICE_URL}/jobs/{job_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error checking status: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return {"status": "error", "message": str(e)}

def get_transcription_result(job_id):
    """Get the results of a completed transcription job."""
    try:
        response = requests.get(f"{SERVICE_URL}/transcript/{job_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error getting results: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response text: {e.response.text}")
        return {"error": str(e)}

def main():
    """Main test execution flow."""
    print("=== Video Transcriber Service Test ===")
    
    # Step 1: Submit job
    job_id = submit_transcription_job()
    if not job_id:
        print("Failed to submit job. Test failed.")
        return False
    
    # Step 2: Poll for completion
    print("\nPolling for job completion...")
    success = False
    for i in range(MAX_RETRIES):
        print(f"Check {i+1}/{MAX_RETRIES}...")
        status_info = check_transcription_status(job_id)
        
        status = status_info.get('status')
        print(f"Status: {status}")
        
        if status == 'completed':
            success = True
            break
        elif status == 'error' or status == 'failed':
            print(f"Job failed: {status_info.get('message', 'Unknown error')}")
            break
        
        # Look for Whisper API related messages
        message = status_info.get('message', '')
        if "Whisper API" in message:
            print(f"Whisper API related message: {message}")
            if "Failed to use Whisper API" in message:
                print("ERROR: Still failing to use Whisper API")
            elif "Using Whisper API" in message:
                print("SUCCESS: Using Whisper API")
        
        print(f"Waiting {RETRY_DELAY} seconds...")
        time.sleep(RETRY_DELAY)
    
    # Step 3: Get results if successful
    if success:
        print("\nJob completed successfully. Getting results...")
        results = get_transcription_result(job_id)
        
        # Check if transcript exists and is not empty
        transcript = results.get('transcript', '')
        if transcript:
            print("\nSUCCESS: Transcription completed successfully!")
            print(f"\nTranscript preview (first 200 chars):\n{transcript[:200]}...")
            
            # Check if Whisper API was used
            meta = results.get('metadata', {})
            if meta.get('transcription_method') == 'whisper_api':
                print("\nConfirmed: Whisper API was used for transcription.")
            else:
                print(f"\nWarning: Transcription method was {meta.get('transcription_method', 'unknown')}")
            
            return True
        else:
            print("ERROR: Transcript is empty.")
            return False
    else:
        print("\nJob did not complete successfully within the timeout period.")
        return False

if __name__ == "__main__":
    success = main()
    print("\n=== Test Summary ===")
    if success:
        print("✅ Test PASSED: The video transcriber service is working correctly with the OpenAI API key.")
        sys.exit(0)
    else:
        print("❌ Test FAILED: The video transcriber service is not working correctly.")
        sys.exit(1)