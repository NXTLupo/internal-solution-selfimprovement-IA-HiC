#!/usr/bin/env python3
import requests
import json
import time
import sys

# Configuration
MCP_URL = "http://localhost:8504"  # video-mcp URL
YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll video

def test_video_transcribe():
    print(f"Testing video.transcribe on URL: {YOUTUBE_URL}")
    
    # Step 1: Call the transcribe endpoint
    try:
        response = requests.post(
            f"{MCP_URL}/mcp/invoke/video.transcribe",
            data={"url": YOUTUBE_URL}
        )
        
        if response.status_code != 200:
            print(f"Error: {response.status_code} - {response.text}")
            return False
            
        result = response.json()
        print(f"Transcription started: {json.dumps(result, indent=2)}")
        
        # Extract job_id
        job_id = result.get("job_id")
        if not job_id:
            print("Error: No job_id returned")
            return False
            
        # Step 2: Poll job status
        print(f"Checking status for job: {job_id}")
        max_attempts = 30
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            try:
                response = requests.post(
                    f"{MCP_URL}/mcp/invoke/video.get_status",
                    data={"job_id": job_id}
                )
                
                if response.status_code != 200:
                    print(f"Error checking status: {response.status_code} - {response.text}")
                    time.sleep(5)
                    continue
                    
                status_result = response.json()
                status = status_result.get("job_status", "unknown")
                progress = status_result.get("progress", 0)
                
                print(f"Status: {status}, Progress: {progress}%")
                
                if status == "completed":
                    break
                    
                if status == "failed":
                    print("Job failed")
                    return False
                    
                time.sleep(5)
            except Exception as e:
                print(f"Error polling status: {e}")
                time.sleep(5)
        
        # Step 3: Get results
        if status == "completed":
            try:
                response = requests.post(
                    f"{MCP_URL}/mcp/invoke/video.get_results",
                    data={"job_id": job_id}
                )
                
                if response.status_code != 200:
                    print(f"Error getting results: {response.status_code} - {response.text}")
                    return False
                    
                results = response.json()
                
                # Print excerpt of transcript
                transcript = results.get("transcript", "")
                if transcript:
                    print("\nTranscript excerpt:")
                    excerpt = transcript[:200] + "..." if len(transcript) > 200 else transcript
                    print(excerpt)
                    return True
                else:
                    print("No transcript returned")
                    return False
            except Exception as e:
                print(f"Error getting results: {e}")
                return False
        else:
            print(f"Job did not complete in time. Last status: {status}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = test_video_transcribe()
    print(f"\nTest {'succeeded' if success else 'failed'}")
    sys.exit(0 if success else 1)