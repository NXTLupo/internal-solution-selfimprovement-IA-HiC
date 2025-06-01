#!/usr/bin/env python3
"""
Helper script to force-split large audio files into small chunks.
This can be run directly on problematic audio files that exceed size limits.
"""

import os
import subprocess
import argparse
import math
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("force-split")

def get_audio_duration(audio_path):
    """Get the duration of an audio file in seconds."""
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
    """Get file size in megabytes"""
    return os.path.getsize(file_path) / (1024 * 1024)

def force_split_audio(input_file, output_dir, target_size_mb=10, chunk_duration=None):
    """
    Force split audio into chunks with target size
    
    Args:
        input_file: Input audio file path
        output_dir: Directory to save chunks
        target_size_mb: Target size in MB for each chunk
        chunk_duration: Override chunk duration in seconds (optional)
    """
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
