#!/usr/bin/env python3
"""
Test Whisper API with the CORRECT OpenAI API key
"""

import os
import openai

# FORCE the correct API key - override any environment variable
CORRECT_KEY = "***REDACTED-OPENAI-KEY***"

print("Testing OpenAI Whisper API with CORRECT key...")
print(f"Key ends in: ...{CORRECT_KEY[-4:]}")

# Set the API key
os.environ['OPENAI_API_KEY'] = CORRECT_KEY
openai.api_key = CORRECT_KEY

# Create a simple test audio file
import wave
import struct

def create_test_audio():
    """Create a 1-second test WAV file."""
    filename = "test_audio.wav"
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 2 bytes per sample
        wav_file.setframerate(16000)  # 16kHz sample rate

        # Generate 1 second of silence
        duration = 1
        num_samples = duration * 16000
        samples = [struct.pack('h', 0) for _ in range(num_samples)]
        wav_file.writeframes(b''.join(samples))

    return filename

try:
    # Create test audio
    audio_file = create_test_audio()
    print(f"Created test audio file: {audio_file}")

    # Test Whisper API
    with open(audio_file, "rb") as f:
        response = openai.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text"
        )

    print("\n✓ SUCCESS! Whisper API is working with the correct key!")
    print(f"Transcription result: '{response}'")

    # Clean up
    os.remove(audio_file)

except Exception as e:
    print(f"\n✗ ERROR: {e}")
    if "401" in str(e):
        print("\nThe API key is still incorrect!")
        print("Check your system environment variables:")
        print("1. Open System Properties > Environment Variables")
        print("2. Look for OPENAI_API_KEY in User or System variables")
        print("3. Remove or update it with the correct key")

    # Clean up on error
    if os.path.exists("test_audio.wav"):
        os.remove("test_audio.wav")