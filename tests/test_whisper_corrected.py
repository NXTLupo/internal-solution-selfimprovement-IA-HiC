#!/usr/bin/env python3
"""Test script to verify Whisper API works with the correct OpenAI API key"""

import os
from pathlib import Path

# Load the correct API key from root .env
root_env_file = Path(__file__).parent / ".env"
if root_env_file.exists():
    with open(root_env_file, "r") as f:
        for line in f:
            if line.strip() and line.startswith("OPENAI_API_KEY="):
                os.environ["OPENAI_API_KEY"] = line.strip().split("=", 1)[1]
                break

api_key = os.environ.get("OPENAI_API_KEY", "")
if not api_key:
    print("[ERROR] No OPENAI_API_KEY found in root .env file!")
    exit(1)

print(f"[INFO] Using OPENAI_API_KEY: {api_key[:15]}...")

# Test the Whisper API
try:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)

    # Create a simple test audio file (silent)
    import tempfile
    import wave
    import struct

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        temp_path = temp_file.name

        # Create a 1-second silent WAV file
        with wave.open(temp_path, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)   # 16-bit
            wav_file.setframerate(16000)  # 16kHz

            # Write 1 second of silence (16000 samples of 0)
            frames = struct.pack('<' + 'h' * 16000, *[0] * 16000)
            wav_file.writeframes(frames)

    print(f"[INFO] Created test audio file: {temp_path}")

    # Test transcription
    print("[INFO] Testing Whisper API transcription...")

    with open(temp_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )

    print("[SUCCESS] Whisper API call succeeded!")
    print(f"[INFO] Transcript (should be empty or minimal for silent audio): '{transcript}'")

    # Clean up
    os.unlink(temp_path)

except Exception as e:
    print(f"[ERROR] Whisper API test failed: {e}")
    if "401" in str(e):
        print("[ERROR] Authentication failed - API key is invalid")
    elif "429" in str(e):
        print("[ERROR] Rate limit exceeded")
    elif "insufficient_quota" in str(e):
        print("[ERROR] OpenAI account has insufficient quota")
    exit(1)

print("\n" + "="*60)
print("Whisper API Test Complete - API Key is Working!")
print("="*60)