#!/usr/bin/env python3
"""
Test script for LinkedIn podcast generation debugging
"""

import requests
import json
import time

def test_podcast_generation():
    print("🎙️ Testing LinkedIn Podcast Generation")
    
    # Test content
    test_content = """
    The future of artificial intelligence in business is not about replacing humans, 
    but about augmenting human capabilities. Companies that understand this fundamental 
    principle will be the ones that succeed in the AI-driven economy.
    """
    
    # Test session ID
    session_id = f"test_{int(time.time())}"
    
    print(f"📋 Session ID: {session_id}")
    print(f"📝 Content length: {len(test_content)} characters")
    
    # Create Mulmo script
    mulmo_script = {
        "$mulmocast": {
            "version": "1.0",
            "credit": "closing"
        },
        "canvasSize": {
            "width": 1280,
            "height": 720
        },
        "speechParams": {
            "provider": "openai",
            "speakers": {
                "Host": {
                    "displayName": {"en": "Host"},
                    "voiceId": "alloy"
                }
            }
        },
        "audioParams": {
            "padding": 0.3,
            "introPadding": 1,
            "closingPadding": 0.8,
            "outroPadding": 1,
            "bgmVolume": 0.1,
            "audioVolume": 1
        },
        "title": f"LinkedIn Content Podcast - {session_id}",
        "description": "AI-generated podcast from LinkedIn content",
        "lang": "en",
        "beats": [
            {
                "speaker": "Host",
                "text": "Welcome to our LinkedIn content podcast. In today's episode, we'll be exploring some thought-provoking professional insights."
            },
            {
                "speaker": "Host", 
                "text": test_content.strip()
            },
            {
                "speaker": "Host",
                "text": "Thank you for listening to our LinkedIn content podcast. These insights can help drive meaningful professional conversations and engagement on LinkedIn."
            }
        ]
    }
    
    mulmocast_url = "http://localhost:5008"
    
    print(f"🔗 Mulmocast URL: {mulmocast_url}")
    
    # Step 1: Check Mulmocast health
    try:
        health_response = requests.get(f"{mulmocast_url}/health", timeout=5)
        print(f"✅ Health check: {health_response.status_code} - {health_response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Step 2: Upload script
    script_filename = f"linkedin_podcast_{session_id}.json"
    script_content = json.dumps(mulmo_script, indent=2)
    
    print(f"📤 Uploading script: {script_filename}")
    print(f"📋 Script size: {len(script_content)} bytes")
    
    try:
        upload_response = requests.post(
            f"{mulmocast_url}/api/upload",
            files={'files': (script_filename, script_content, 'application/json')},
            timeout=30
        )
        
        print(f"📤 Upload response: {upload_response.status_code}")
        upload_result = upload_response.json()
        print(f"📋 Upload result: {upload_result}")
        
        if not upload_result.get("success", False):
            print(f"❌ Upload failed: {upload_result}")
            return
            
        uploaded_files = upload_result.get("files", [])
        if not uploaded_files:
            print(f"❌ No files in upload result")
            return
            
        script_file_path = uploaded_files[0].get("path", f"uploads/{script_filename}")
        print(f"✅ Script uploaded: {script_file_path}")
        
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return
    
    # Step 3: Generate audio
    print(f"🎵 Generating audio from script...")
    
    try:
        audio_response = requests.post(
            f"{mulmocast_url}/api/execute",
            json={
                "command": "audio",
                "args": [script_file_path, "--force"]
            },
            timeout=300
        )
        
        print(f"🎵 Audio response: {audio_response.status_code}")
        audio_result = audio_response.json()
        print(f"📋 Audio result: {audio_result}")
        
        if not audio_result.get("success", False):
            print(f"❌ Audio generation failed: {audio_result}")
            return
            
        print(f"✅ Audio generation completed")
        
    except Exception as e:
        print(f"❌ Audio generation failed: {e}")
        return
    
    # Step 4: Check for generated files
    print(f"📁 Checking for generated audio files...")
    
    try:
        files_response = requests.get(f"{mulmocast_url}/api/files")
        
        if files_response.ok:
            files_data = files_response.json()
            
            # Find audio files
            audio_files = [f for f in files_data if f.get("type") == "audio"]
            print(f"🎵 Found {len(audio_files)} audio files")
            
            # Find session-specific files
            session_audio_files = [
                f for f in files_data 
                if f.get("type") == "audio" and session_id in f.get("name", "")
            ]
            
            print(f"🎙️ Found {len(session_audio_files)} session-specific audio files")
            
            if session_audio_files:
                latest_audio = session_audio_files[0]
                print(f"✅ Latest audio file: {latest_audio['name']}")
                print(f"📁 Path: {latest_audio['path']}")
                print(f"📊 Size: {latest_audio.get('size', 0)} bytes")
                print(f"🔗 Download URL: {mulmocast_url}/download/{latest_audio['path']}")
                print(f"🎵 Preview URL: {mulmocast_url}/api/preview/{latest_audio['path']}")
                return True
            else:
                print(f"⚠️ No session-specific audio files found")
                if audio_files:
                    latest_audio = max(audio_files, key=lambda x: x.get("modified", 0))
                    print(f"📁 Most recent audio: {latest_audio['name']}")
                    print(f"🔗 Download URL: {mulmocast_url}/download/{latest_audio['path']}")
                    return True
        else:
            print(f"❌ Failed to list files: {files_response.status_code}")
            
    except Exception as e:
        print(f"❌ File listing failed: {e}")
        return
    
    print(f"❌ No audio files found after generation")
    return False

if __name__ == "__main__":
    success = test_podcast_generation()
    if success:
        print("\n🎉 Podcast generation test PASSED")
    else:
        print("\n💥 Podcast generation test FAILED")