#!/usr/bin/env python3
"""
Hotfix script to properly enforce size limits for Whisper API transcription.
This script directly patches the application to ensure no files over 20MB are sent to the API.
"""

import os
import logging
import sys
import shutil
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("fix-whisper")

# Define the target files
ENHANCED_WHISPER_API_PATH = "src/transcription/enhanced_whisper_api.py"

def backup_file(file_path):
    """Create a backup of a file before modifying it"""
    backup_path = f"{file_path}.bak"
    logger.info(f"Creating backup: {backup_path}")
    shutil.copy2(file_path, backup_path)
    return backup_path

def get_file_size(file_path):
    """Get file size in bytes"""
    return os.path.getsize(file_path)

def patch_size_limit():
    """Update the MAX_FILE_SIZE_MB constant to be more conservative"""
    file_path = ENHANCED_WHISPER_API_PATH
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    backup_file(file_path)
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace the MAX_FILE_SIZE_MB value with a more conservative one
    content = content.replace("MAX_FILE_SIZE_MB = 20", "MAX_FILE_SIZE_MB = 15")
    
    # Add additional size enforcement to the API call
    target_code = "# Check file size\n        file_size_mb = get_file_size_mb(audio_path)\n        if file_size_mb > MAX_FILE_SIZE_MB:"
    replacement_code = """# Check file size
        file_size_mb = get_file_size_mb(audio_path)
        
        # CRITICAL: ENFORCE SIZE LIMIT - Additional safety check
        if file_size_mb > 15:
            # Emergency file size reduction
            emergency_path = audio_path + ".emergency.mp3"
            try:
                logger.warning(f"EMERGENCY SIZE REDUCTION: File is {file_size_mb:.2f}MB, reducing to ≤15MB")
                import subprocess
                subprocess.check_call([
                    'ffmpeg', '-i', audio_path, 
                    '-c:a', 'libmp3lame',
                    '-ac', '1',               # Mono
                    '-ar', '16000',           # 16kHz sampling
                    '-b:a', '8k',             # Ultra-low bitrate for emergency
                    '-map_metadata', '-1',    # Remove metadata
                    '-y',                     # Overwrite output
                    emergency_path
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
                # Replace original with emergency version
                import shutil
                shutil.move(emergency_path, audio_path)
                
                # Check size again
                file_size_mb = get_file_size_mb(audio_path)
                logger.info(f"After emergency reduction: {file_size_mb:.2f}MB")
                
                # If STILL too large, refuse to proceed
                if file_size_mb > 15:
                    raise ValueError(f"CRITICAL: Even after emergency reduction, file is still {file_size_mb:.2f}MB. Cannot proceed with Whisper API.")
            except Exception as e:
                logger.error(f"Emergency size reduction failed: {e}")
                raise ValueError(f"Audio file size ({file_size_mb:.2f} MB) exceeds Whisper API limit and emergency reduction failed")
        
        # Original size check        
        if file_size_mb > MAX_FILE_SIZE_MB:"""
    
    # Replace the target code with the new code
    content = content.replace(target_code, replacement_code)
    
    # Replace 16k bitrate with 8k in the extreme compression section
    content = content.replace('"-b:a", "16k",', '"-b:a", "8k",')
    
    # Update the safe_chunk_duration calculation to be more aggressive
    target_code = '    # Start with a smaller chunk duration (70% of calculated max) to be safe\n    safe_chunk_duration = max(60, int(max_chunk_duration * 0.7))'
    replacement_code = '    # Start with a much smaller chunk duration (50% of calculated max) to be extra safe\n    safe_chunk_duration = max(30, int(max_chunk_duration * 0.5))'
    content = content.replace(target_code, replacement_code)
    
    # Make subchunking more aggressive
    target_code = '            # Calculate a more aggressive sub-chunk duration\n            subchunk_count = math.ceil(size_mb / (MAX_FILE_SIZE_MB * 0.8))'
    replacement_code = '            # Calculate a more aggressive sub-chunk duration\n            subchunk_count = math.ceil(size_mb / (MAX_FILE_SIZE_MB * 0.6))'
    content = content.replace(target_code, replacement_code)
    
    # Write the updated content back to the file
    with open(file_path, 'w') as f:
        f.write(content)
    
    logger.info(f"Updated MAX_FILE_SIZE_MB to 15MB and added emergency size reduction in {file_path}")
    return True

def update_health_endpoint():
    """Update the health endpoint to reflect the new size limit"""
    file_path = "src/app.py"
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    backup_file(file_path)
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace the size limit value
    content = content.replace('"max_file_size_mb": 20,', '"max_file_size_mb": 15,')
    
    # Write the updated content back to the file
    with open(file_path, 'w') as f:
        f.write(content)
    
    logger.info(f"Updated max_file_size_mb to 15MB in health endpoint")
    return True

def create_force_split_script():
    """Create a helper script to force splitting large audio files before transcription"""
    script_path = "src/transcription/force_split.py"
    
    with open(script_path, 'w') as f:
        f.write("""#!/usr/bin/env python3
\"\"\"
Helper script to force-split large audio files into small chunks.
This can be run directly on problematic audio files that exceed size limits.
\"\"\"

import os
import subprocess
import argparse
import math
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("force-split")

def get_audio_duration(audio_path):
    \"\"\"Get the duration of an audio file in seconds.\"\"\"
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", 
           "-of", "default=noprint_wrappers=1:nokey=1", audio_path]
    
    try:
        output = subprocess.check_output(cmd).decode('utf-8').strip()
        duration = float(output)
        logger.debug(f"Audio duration: {duration}s")
        return duration
    except Exception as e:
        logger.error(f"Error getting audio duration: {str(e)}")
        return 0.0

def get_file_size_mb(file_path):
    \"\"\"Get file size in megabytes\"\"\"
    return os.path.getsize(file_path) / (1024 * 1024)

def force_split_audio(input_file, output_dir, target_size_mb=10, chunk_duration=None):
    \"\"\"
    Force split audio into chunks with target size
    
    Args:
        input_file: Input audio file path
        output_dir: Directory to save chunks
        target_size_mb: Target size in MB for each chunk
        chunk_duration: Override chunk duration in seconds (optional)
    \"\"\"
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Get audio duration
    duration = get_audio_duration(input_file)
    if duration == 0:
        logger.error(f"Could not determine duration of {input_file}")
        return False
    
    # Get file size
    file_size_mb = get_file_size_mb(input_file)
    
    # Calculate chunk duration if not provided
    if chunk_duration is None:
        # Calculate bytes per second
        bytes_per_second = (file_size_mb * 1024 * 1024) / duration
        
        # Calculate how many seconds would fit in target_size_mb
        chunk_duration = (target_size_mb * 1024 * 1024) / bytes_per_second
        
        # Apply a safety factor of 0.8
        chunk_duration = chunk_duration * 0.8
        
        # Ensure at least 30 seconds per chunk
        chunk_duration = max(30, chunk_duration)
    
    # Round down to be safe
    chunk_duration = math.floor(chunk_duration)
    
    logger.info(f"Splitting {input_file} ({file_size_mb:.2f}MB, {duration:.2f}s) into chunks of {chunk_duration}s")
    
    # Calculate number of chunks
    num_chunks = math.ceil(duration / chunk_duration)
    
    chunks = []
    for i in range(num_chunks):
        start_time = i * chunk_duration
        chunk_duration_actual = min(chunk_duration, duration - start_time)
        
        # Skip zero-duration chunks
        if chunk_duration_actual <= 0:
            continue
        
        # Define output path
        output_path = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
        
        # Extract chunk using ffmpeg with aggressive compression
        cmd = [
            "ffmpeg", "-i", input_file, 
            "-ss", str(start_time), 
            "-t", str(chunk_duration_actual),
            "-c:a", "libmp3lame",
            "-ac", "1",               # Mono
            "-ar", "16000",           # 16kHz sampling
            "-b:a", "8k",             # Ultra-low bitrate
            "-map_metadata", "-1",    # Remove metadata
            "-y",                     # Overwrite output
            output_path
        ]
        
        try:
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Get file size
            chunk_size_mb = get_file_size_mb(output_path)
            logger.info(f"Created chunk {i+1}/{num_chunks}: {output_path} ({chunk_size_mb:.2f}MB)")
            
            chunks.append({
                "path": output_path,
                "start": start_time,
                "duration": chunk_duration_actual,
                "size_mb": chunk_size_mb
            })
            
            # Verify chunk size is under limit
            if chunk_size_mb > target_size_mb:
                logger.warning(f"Chunk {i+1} is still {chunk_size_mb:.2f}MB, which exceeds target of {target_size_mb}MB")
        except Exception as e:
            logger.error(f"Error creating chunk {i+1}: {e}")
    
    logger.info(f"Created {len(chunks)} chunks in {output_dir}")
    return chunks

def main():
    parser = argparse.ArgumentParser(description="Force split audio into small chunks for Whisper API")
    parser.add_argument("input_file", help="Input audio file")
    parser.add_argument("--output-dir", "-o", default="chunks", help="Output directory for chunks")
    parser.add_argument("--target-size", "-s", type=float, default=10, help="Target size in MB (default: 10)")
    parser.add_argument("--chunk-duration", "-d", type=float, help="Override chunk duration in seconds")
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.exists(args.input_file):
        logger.error(f"Input file not found: {args.input_file}")
        return 1
    
    # Force split the audio
    chunks = force_split_audio(args.input_file, args.output_dir, args.target_size, args.chunk_duration)
    
    if not chunks:
        logger.error("Failed to split audio")
        return 1
    
    logger.info(f"Successfully split audio into {len(chunks)} chunks")
    return 0

if __name__ == "__main__":
    sys.exit(main())
""")
    
    logger.info(f"Created force_split.py helper script")
    return True

def main():
    logger.info("Starting Whisper API chunking fix")
    
    # Check if we're in the right directory
    if not os.path.exists("src/transcription"):
        logger.error("Error: Not in the Video Transcriber directory. Please run this script from the root of the Video Transcriber project.")
        return 1
    
    # Patch the size limit in enhanced_whisper_api.py
    if not patch_size_limit():
        logger.error("Failed to patch size limit")
        return 1
    
    # Update the health endpoint
    if not update_health_endpoint():
        logger.warning("Failed to update health endpoint, but continuing")
    
    # Create the force_split.py helper script
    if not create_force_split_script():
        logger.warning("Failed to create force_split.py helper script, but continuing")
    
    logger.info("Whisper API chunking fix completed successfully")
    logger.info("Now using a strict 15MB limit for all chunks with emergency size reduction")
    return 0

if __name__ == "__main__":
    sys.exit(main())