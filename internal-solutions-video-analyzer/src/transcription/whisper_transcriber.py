import os
import logging
import asyncio
import torch
import whisper
import json
from typing import Dict, List, Optional, Any, Union
import re
import math

from ..models import TranscriptionResult, TranscriptSegment

logger = logging.getLogger("video-analyzer.whisper_transcriber")

async def transcribe_audio(
    audio_path: str, 
    language: Optional[str] = None,
    model_size: str = "large-v2"
) -> TranscriptionResult:
    """
    Transcribe audio using Whisper model.
    
    Args:
        audio_path: Path to audio file
        language: Language code (optional, auto-detected if not provided)
        model_size: Whisper model size (tiny, base, small, medium, large-v2)
        
    Returns:
        TranscriptionResult with segments and full text
    """
    try:
        logger.info(f"Transcribing audio {audio_path} with Whisper {model_size}")
        
        # Check if file exists
        if not os.path.exists(audio_path):
            error_msg = f"Audio file not found: {audio_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Run in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: transcribe_with_whisper(audio_path, language, model_size)
        )
        
        # Convert to our model format
        segments = []
        for segment in result["segments"]:
            segments.append(TranscriptSegment(
                text=segment["text"].strip(),
                start=segment["start"],
                end=segment["end"],
                words=segment.get("words", [])
            ))
        
        transcription = TranscriptionResult(
            segments=segments,
            text=result["text"],
            source="whisper",
            language=result.get("language", language)
        )
        
        logger.info(f"Transcription complete: {len(transcription.text)} characters")
        return transcription
        
    except Exception as e:
        logger.error(f"Error in Whisper transcription: {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {str(e)}")

def transcribe_with_whisper(
    audio_path: str,
    language: Optional[str] = None,
    model_size: str = "large-v2"
) -> Dict[str, Any]:
    """
    Core Whisper transcription function.
    
    Args:
        audio_path: Path to audio file
        language: Language code (optional)
        model_size: Whisper model size
        
    Returns:
        Dictionary with transcription results
    """
    # Load Whisper model
    model = whisper.load_model(model_size)
    
    # Set transcription options
    options = {}
    if language:
        options["language"] = language
    
    # Transcribe audio
    try:
        result = model.transcribe(
            audio_path,
            verbose=False,
            word_timestamps=True,  # Get word-level timestamps if available
            **options
        )
        
        # Clean up GPU memory if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        return result
        
    except Exception as e:
        logger.error(f"Error in Whisper transcription: {e}")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise

async def transcribe_audio_chunks(
    audio_path: str,
    language: Optional[str] = None,
    model_size: str = "large-v2",
    chunk_size: int = 600  # 10 minutes in seconds
) -> TranscriptionResult:
    """
    Transcribe long audio by splitting into chunks.
    
    Args:
        audio_path: Path to audio file
        language: Language code
        model_size: Whisper model size
        chunk_size: Chunk size in seconds
        
    Returns:
        TranscriptionResult with combined results
    """
    from .youtube_fetcher import get_audio_duration
    
    # Get audio duration
    duration = get_audio_duration(audio_path)
    
    if duration <= chunk_size:
        # Audio is short enough, transcribe directly
        return await transcribe_audio(audio_path, language, model_size)
    
    logger.info(f"Audio duration ({duration}s) exceeds chunk size ({chunk_size}s), splitting into chunks")
    
    # Create temp directory for chunks
    temp_dir = os.path.join(os.path.dirname(audio_path), "chunks")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Split audio into chunks
        chunk_paths = chunk_audio_for_transcription(audio_path, temp_dir, chunk_size)
        
        # Transcribe each chunk
        chunk_results = []
        for i, chunk_path in enumerate(chunk_paths):
            logger.info(f"Transcribing chunk {i+1}/{len(chunk_paths)}")
            chunk_result = await transcribe_audio(chunk_path, language, model_size)
            chunk_results.append(chunk_result)
        
        # Combine results
        combined_result = combine_transcription_chunks(chunk_results, chunk_size)
        
        return combined_result
        
    finally:
        # Clean up temporary files
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def chunk_audio_for_transcription(
    audio_path: str, 
    chunk_dir: str, 
    chunk_size: int = 600
) -> List[str]:
    """
    Split audio into chunks for parallel processing.
    
    Args:
        audio_path: Path to audio file
        chunk_dir: Directory to save chunks
        chunk_size: Chunk size in seconds
        
    Returns:
        List of paths to audio chunks
    """
    import subprocess
    from .youtube_fetcher import get_audio_duration
    
    os.makedirs(chunk_dir, exist_ok=True)
    
    # Get audio duration
    duration = get_audio_duration(audio_path)
    
    # Calculate number of chunks
    num_chunks = math.ceil(duration / chunk_size)
    chunk_paths = []
    
    # Split audio into chunks
    for i in range(num_chunks):
        start_time = i * chunk_size
        chunk_duration = min(chunk_size, duration - start_time)
        chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.mp3")
        
        # Use FFmpeg to extract chunk
        cmd = [
            "ffmpeg", "-i", audio_path, 
            "-ss", str(start_time), 
            "-t", str(chunk_duration),
            "-c:a", "copy", chunk_path, "-y"
        ]
        
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        chunk_paths.append(chunk_path)
    
    logger.info(f"Split audio into {len(chunk_paths)} chunks")
    return chunk_paths

def combine_transcription_chunks(
    chunk_results: List[TranscriptionResult],
    chunk_size: int = 600
) -> TranscriptionResult:
    """
    Combine transcription results from multiple chunks.
    
    Args:
        chunk_results: List of TranscriptionResult objects
        chunk_size: Chunk size in seconds used for splitting
        
    Returns:
        Combined TranscriptionResult
    """
    combined_segments = []
    combined_text = ""
    
    # Process each chunk
    for i, chunk_result in enumerate(chunk_results):
        # Adjust timestamps for each chunk
        time_offset = i * chunk_size
        
        for segment in chunk_result.segments:
            adjusted_segment = TranscriptSegment(
                text=segment.text,
                start=segment.start + time_offset,
                end=segment.end + time_offset,
                words=segment.words
            )
            combined_segments.append(adjusted_segment)
        
        # Add chunk text to combined text
        if combined_text and not combined_text.endswith(' '):
            combined_text += ' '
        combined_text += chunk_result.text
    
    # Sort segments by start time (just in case)
    combined_segments.sort(key=lambda s: s.start)
    
    # Create combined result
    language = chunk_results[0].language if chunk_results else None
    combined_result = TranscriptionResult(
        segments=combined_segments,
        text=combined_text,
        source="whisper",
        language=language
    )
    
    logger.info(f"Combined {len(chunk_results)} chunk results into one transcription")
    return combined_result

def generate_srt(segments: List[TranscriptSegment], output_path: str) -> None:
    """
    Generate SRT subtitle file from transcript segments.
    
    Args:
        segments: List of TranscriptSegment objects
        output_path: Path to save SRT file
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments, 1):
            # Format: index, timestamp range, text
            start_time = format_timestamp(segment.start)
            end_time = format_timestamp(segment.end)
            
            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{segment.text}\n\n")
    
    logger.info(f"Generated SRT file at {output_path}")

def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds / 3600)
    seconds %= 3600
    minutes = int(seconds / 60)
    seconds %= 60
    milliseconds = int((seconds - int(seconds)) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"