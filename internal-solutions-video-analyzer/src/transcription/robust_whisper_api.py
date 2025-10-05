"""
Robust Whisper API Implementation for Long-Form Audio Transcription

This module implements a comprehensive solution for transcribing audio files of any length
using OpenAI's Whisper API, with special handling to prevent 413 Content Too Large errors.
"""

import os
import logging
import asyncio
import json
import math
import re
import shutil
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple, AsyncGenerator
import subprocess
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


# Added by fix script
api_key=os.environ.get('OPENAI_API_KEY', '')


# Added by fix script
api_key=os.environ.get('OPENAI_API_KEY', '')

from ..models import TranscriptionResult, TranscriptSegment

# Configure logging
logger = logging.getLogger("video-analyzer.robust_whisper_api")

# Get OpenAI API key from environment
def get_openai_api_key():
    """Get the OpenAI API key from the environment and clean it"""
    api_key = os.getenv("OPENAI_API_KEY", "")
    
    # Clean the API key in case it has newlines or other unexpected characters
    if api_key:
        api_key = api_key.strip().split('\n')[0].strip()
    
    return api_key

OPENAI_API_KEY = get_openai_api_key()
logger.info(f"OpenAI API key loaded: {bool(OPENAI_API_KEY)}, Length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")

# Constants for multipart form data and size limits
MULTIPART_OVERHEAD_FACTOR = 1.15  # 15% overhead buffer
MAX_WHISPER_LIMIT = 25 * 1024 * 1024  # 25MB API limit
MAX_SAFE_SIZE = int(MAX_WHISPER_LIMIT * 0.75)  # 75% of 25MB limit (18.75MB)
MAX_FILE_SIZE_MB = 18  # Maximum file size in MB (slightly below MAX_SAFE_SIZE)


def calculate_multipart_overhead(filename: str, field_name: str = "file") -> int:
    """
    Calculate the approximate overhead introduced by multipart form data encoding
    
    Args:
        filename: Name of the file being uploaded
        field_name: Name of the form field for the file
        
    Returns:
        Estimated overhead in bytes
    """
    boundary_length = 50  # Average boundary length
    
    # Headers for each part
    content_disposition = f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"'
    content_type = "Content-Type: audio/mpeg"
    
    # Calculate total overhead for file part
    file_overhead = (
        4 +  # Initial boundary markers "--"
        boundary_length +
        2 +  # CRLF after boundary
        len(content_disposition) +
        2 +  # CRLF after Content-Disposition
        len(content_type) +
        4 +  # Double CRLF before content
        2 +  # CRLF after content
        4 +  # Final boundary markers "--"
        boundary_length +
        4 +  # Final boundary end markers "--"
        2    # Final CRLF
    )
    
    # Additional fields overhead (model, format, etc.)
    model_field = 'Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n'
    format_field = 'Content-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n'
    
    additional_fields_overhead = len(model_field) + len(format_field)
    
    # Add boundaries for additional fields
    additional_fields_overhead += (
        (4 + boundary_length + 2) * 2  # Two additional fields with boundaries
    )
    
    total_overhead = file_overhead + additional_fields_overhead
    
    # Add safety margin
    return int(total_overhead * 1.1)  # Add 10% extra safety


def predict_multipart_size(file_path: str, model: str = "whisper-1") -> int:
    """
    Predict the actual multipart request size before processing
    
    Args:
        file_path: Path to the audio file
        model: Whisper model to use
        
    Returns:
        Predicted request size in bytes
    """
    file_size = os.path.getsize(file_path)
    filename = os.path.basename(file_path)
    
    # Calculate multipart overhead
    overhead = calculate_multipart_overhead(filename)
    
    # Add form fields overhead
    model_field_overhead = len(f'Content-Disposition: form-data; name="model"\r\n\r\n{model}\r\n')
    
    # Total predicted size
    predicted_size = file_size + overhead + model_field_overhead
    
    # Apply safety factor
    return int(predicted_size * MULTIPART_OVERHEAD_FACTOR)


def get_file_size_mb(file_path: str) -> float:
    """Get file size in megabytes"""
    return os.path.getsize(file_path) / (1024 * 1024)


def optimize_audio_aggressively(input_path: str, target_size_mb: float = 18) -> str:
    """
    Multi-stage audio optimization with size targeting
    
    Args:
        input_path: Path to input audio file
        target_size_mb: Target size in MB
        
    Returns:
        Path to optimized audio file
    """
    logger.info(f"Aggressively optimizing audio: {input_path} to target {target_size_mb}MB")
    
    # Create temporary file for output
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
        output_path = temp_file.name
    
    # Stage 1: Basic optimization
    try:
        subprocess.run([
            'ffmpeg', '-i', input_path,
            '-c:a', 'libmp3lame',
            '-ac', '1',           # Mono
            '-ar', '16000',       # 16kHz sampling rate
            '-b:a', '32k',        # Low bitrate
            '-map_metadata', '-1', # Remove metadata
            '-y', output_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Check size and apply additional reduction if needed
        current_size_mb = get_file_size_mb(output_path)
        logger.info(f"Stage 1 optimization: {current_size_mb:.2f}MB")
        
        # Check if we need to perform more aggressive optimization
        if current_size_mb > target_size_mb:
            logger.info(f"File still too large ({current_size_mb:.2f}MB), applying stage 2 optimization")
            
            # Stage 2: Ultra-aggressive optimization
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as ultra_temp:
                ultra_path = ultra_temp.name
                
            subprocess.run([
                'ffmpeg', '-i', output_path,
                '-c:a', 'libmp3lame',
                '-ac', '1',
                '-ar', '12000',       # Even lower sampling rate
                '-b:a', '16k',        # Ultra-low bitrate
                '-compression_level', '9',  # Maximum compression
                '-y', ultra_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            # Replace output with ultra-optimized version
            os.replace(ultra_path, output_path)
            
            # Final size check
            final_size_mb = get_file_size_mb(output_path)
            logger.info(f"Stage 2 optimization: {final_size_mb:.2f}MB")
            
            # If still too large, try one last extreme optimization
            if final_size_mb > target_size_mb:
                logger.warning(f"File still too large ({final_size_mb:.2f}MB), applying emergency optimization")
                
                # Stage 3: Emergency optimization
                with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as emergency_temp:
                    emergency_path = emergency_temp.name
                    
                subprocess.run([
                    'ffmpeg', '-i', output_path,
                    '-c:a', 'libmp3lame',
                    '-ac', '1',
                    '-ar', '8000',        # Extreme downsampling
                    '-b:a', '8k',         # Bare minimum bitrate
                    '-compression_level', '9',
                    '-y', emergency_path
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                
                # Replace output with emergency version
                os.replace(emergency_path, output_path)
                
                # Final check
                emergency_size_mb = get_file_size_mb(output_path)
                logger.info(f"Emergency optimization: {emergency_size_mb:.2f}MB")
                
                if emergency_size_mb > target_size_mb:
                    logger.error(f"Failed to reduce file below target size: {emergency_size_mb:.2f}MB > {target_size_mb}MB")
        
        # Calculate final multipart size
        predicted_size_bytes = predict_multipart_size(output_path)
        predicted_size_mb = predicted_size_bytes / (1024 * 1024)
        logger.info(f"Final optimized file: {get_file_size_mb(output_path):.2f}MB, predicted request size: {predicted_size_mb:.2f}MB")
        
        return output_path
    
    except Exception as e:
        logger.error(f"Error optimizing audio: {e}")
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise


def detect_silence_boundaries(audio_path: str, 
                            silence_thresh: float = -40.0,
                            min_silence_duration: float = 0.5) -> List[Dict]:
    """
    Detect natural silence boundaries for intelligent chunking
    
    Args:
        audio_path: Path to audio file
        silence_thresh: Silence threshold in dB
        min_silence_duration: Minimum silence duration in seconds
        
    Returns:
        List of silence boundaries
    """
    logger.info(f"Detecting silence boundaries in {audio_path}")
    
    cmd = [
        'ffmpeg', '-i', audio_path,
        '-af', f'silencedetect=noise={silence_thresh}dB:d={min_silence_duration}',
        '-f', 'null', '-'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, stderr=subprocess.STDOUT)
    
    # Parse silence boundaries
    silence_pattern = r'silence_start: ([\d.]+)'
    silence_end_pattern = r'silence_end: ([\d.]+)'
    
    boundaries = []
    silence_starts = re.findall(silence_pattern, result.stdout)
    silence_ends = re.findall(silence_end_pattern, result.stdout)
    
    for start, end in zip(silence_starts, silence_ends):
        boundaries.append({
            'start': float(start),
            'end': float(end),
            'duration': float(end) - float(start)
        })
    
    logger.info(f"Found {len(boundaries)} silence boundaries")
    return boundaries


def create_intelligent_chunks(audio_path: str, 
                            target_duration: float = 600,  # 10 minutes
                            overlap_duration: float = 2.0) -> List[Dict]:
    """
    Create audio chunks using silence boundaries
    
    Args:
        audio_path: Path to audio file
        target_duration: Target duration for each chunk in seconds
        overlap_duration: Overlap duration between chunks in seconds
        
    Returns:
        List of chunk information dictionaries
    """
    logger.info(f"Creating intelligent chunks for {audio_path}")
    
    # Get audio duration
    duration_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', 
                   '-of', 'csv=p=0', audio_path]
    duration = float(subprocess.check_output(duration_cmd).decode().strip())
    
    logger.info(f"Audio duration: {duration:.2f}s")
    
    # Detect silence boundaries
    boundaries = detect_silence_boundaries(audio_path)
    
    chunks = []
    current_start = 0
    chunk_index = 0
    
    while current_start < duration:
        target_end = current_start + target_duration
        
        # Find the best silence boundary near target_end
        best_boundary = None
        min_distance = float('inf')
        
        for boundary in boundaries:
            if boundary['start'] > current_start:
                distance = abs(boundary['start'] - target_end)
                if distance < min_distance and distance < target_duration * 0.2:  # Within 20% of target
                    min_distance = distance
                    best_boundary = boundary
        
        # Determine chunk end
        if best_boundary:
            chunk_end = best_boundary['start']
        else:
            chunk_end = min(target_end, duration)
        
        # Create chunk with overlap
        actual_start = max(0, current_start - overlap_duration) if chunk_index > 0 else current_start
        actual_end = min(duration, chunk_end + overlap_duration)
        
        chunks.append({
            'index': chunk_index,
            'start': actual_start,
            'end': actual_end,
            'duration': actual_end - actual_start,
            'logical_start': current_start,
            'logical_end': chunk_end
        })
        
        current_start = chunk_end
        chunk_index += 1
    
    logger.info(f"Created {len(chunks)} intelligent chunks")
    return chunks


async def extract_audio_chunk(source_path: str, chunk_info: Dict, temp_dir: str) -> str:
    """
    Extract and optimize audio chunk with size validation
    
    Args:
        source_path: Path to source audio file
        chunk_info: Chunk information dictionary
        temp_dir: Directory to store temporary files
        
    Returns:
        Path to extracted and optimized chunk
    """
    chunk_filename = f"chunk_{chunk_info['index']:03d}.mp3"
    chunk_path = os.path.join(temp_dir, chunk_filename)
    
    logger.info(f"Extracting chunk {chunk_info['index']} from {source_path}")
    
    # Extract chunk
    subprocess.run([
        'ffmpeg', '-i', source_path,
        '-ss', str(chunk_info['start']),
        '-t', str(chunk_info['duration']),
        '-c:a', 'libmp3lame',
        '-ac', '1',
        '-ar', '16000',
        '-b:a', '32k',
        '-y', chunk_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    
    # Get initial size
    initial_size_mb = get_file_size_mb(chunk_path)
    logger.info(f"Initial chunk size: {initial_size_mb:.2f}MB")
    
    # Calculate predicted multipart size
    predicted_size = predict_multipart_size(chunk_path)
    predicted_size_mb = predicted_size / (1024 * 1024)
    logger.info(f"Predicted multipart size: {predicted_size_mb:.2f}MB")
    
    # Optimize if needed
    if predicted_size > MAX_SAFE_SIZE:
        logger.info(f"Chunk exceeds safe size limit ({predicted_size_mb:.2f}MB > {MAX_SAFE_SIZE/(1024*1024):.2f}MB), optimizing")
        
        # Apply optimization with target slightly below MAX_FILE_SIZE_MB
        optimized_path = optimize_audio_aggressively(chunk_path, target_size_mb=MAX_FILE_SIZE_MB * 0.9)
        os.replace(optimized_path, chunk_path)
        
        # Final size check
        final_predicted_size = predict_multipart_size(chunk_path)
        final_predicted_size_mb = final_predicted_size / (1024 * 1024)
        
        if final_predicted_size > MAX_SAFE_SIZE:
            logger.error(f"Chunk {chunk_info['index']} still too large after optimization: {final_predicted_size_mb:.2f}MB")
            raise ValueError(f"Chunk {chunk_info['index']} still too large after optimization: {final_predicted_size_mb:.2f}MB")
    
    return chunk_path


class WhisperAPIClient:
    """Client for OpenAI's Whisper API with robust error handling"""
    
    def __init__(self, api_key: str = None, max_retries: int = 3):
        """
        Initialize the Whisper API client
        
        Args:
            api_key: OpenAI API key (defaults to environment variable)
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key or get_openai_api_key()
        self.base_url = "https://api.openai.com/v1/audio/transcriptions"
        self.max_retries = max_retries
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True,
        retry=retry_if_exception_type((httpx.HTTPError, ValueError))
    )
    async def transcribe_chunk(self, 
                              audio_path: str, 
                              chunk_info: Dict,
                              language: str = None,
                              prompt: str = "") -> Dict:
        """
        Transcribe individual chunk with robust error handling
        
        Args:
            audio_path: Path to audio chunk
            chunk_info: Chunk information dictionary
            language: Language code
            prompt: Prompt for transcription context
            
        Returns:
            Transcription result dictionary
        """
        # Pre-flight size check
        predicted_size = predict_multipart_size(audio_path)
        predicted_size_mb = predicted_size / (1024 * 1024)
        
        if predicted_size > MAX_SAFE_SIZE:
            raise ValueError(f"Chunk size {predicted_size_mb:.2f}MB exceeds safe limit {MAX_SAFE_SIZE/(1024*1024):.2f}MB")
        
        logger.info(f"Transcribing chunk {chunk_info['index']} with API, predicted size: {predicted_size_mb:.2f}MB")
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            with open(audio_path, 'rb') as audio_file:
                files = {
                    'file': (os.path.basename(audio_path), audio_file, 'audio/mpeg')
                }
                
                data = {
                    'model': 'whisper-1',
                    'response_format': 'verbose_json'
                }
                
                if language:
                    data['language'] = language
                    
                if prompt.strip():
                    # Whisper prompt token limit is 224 tokens (~180 words)
                    prompt_words = prompt.split()
                    if len(prompt_words) > 180:
                        prompt = " ".join(prompt_words[-180:])
                    data['prompt'] = prompt
                
                headers = {
                    'Authorization': f'Bearer {self.api_key}'
                }
                
                try:
                    start_time = time.time()
                    response = await client.post(
                        self.base_url,
                        files=files,
                        data=data,
                        headers=headers
                    )
                    elapsed = time.time() - start_time
                    
                    if response.status_code == 413:
                        # Calculate actual request size if available
                        actual_size = len(response.request.content) if hasattr(response.request, 'content') and response.request.content else predicted_size
                        actual_size_mb = actual_size / (1024 * 1024)
                        
                        logger.error(f"413 Error: Actual request size {actual_size_mb:.2f}MB exceeds API limit")
                        raise ValueError(f"413 Error: Actual request size {actual_size_mb:.2f}MB exceeds API limit")
                    
                    response.raise_for_status()
                    result = response.json()
                    
                    logger.info(f"Transcription successful for chunk {chunk_info['index']}, took {elapsed:.2f}s")
                    
                    # Transform to match expected format
                    transformed_result = {
                        "text": result.get("text", ""),
                        "segments": []
                    }
                    
                    # Process segments
                    for i, segment in enumerate(result.get("segments", [])):
                        transformed_segment = {
                            "id": i,
                            "text": segment.get("text", "").strip(),
                            "start": segment.get("start", 0),
                            "end": segment.get("end", 0),
                            "words": segment.get("words", [])
                        }
                        transformed_result["segments"].append(transformed_segment)
                    
                    transformed_result["language"] = result.get("language", language)
                    
                    return transformed_result
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 413:
                        logger.error(f"413 Content Too Large: Chunk {chunk_info['index']} request size exceeded API limit")
                        raise ValueError(f"413 Content Too Large: Chunk {chunk_info['index']} request size exceeded API limit")
                    logger.error(f"HTTP error during transcription: {e}")
                    raise
                except Exception as e:
                    logger.error(f"Error transcribing chunk {chunk_info['index']}: {e}")
                    raise


def assemble_transcription(chunk_results: List[Dict], chunk_info_list: List[Dict]) -> Dict:
    """
    Assemble chunks with overlap handling and timing correction
    
    Args:
        chunk_results: List of transcription results for each chunk
        chunk_info_list: List of chunk information dictionaries
        
    Returns:
        Assembled transcription result
    """
    logger.info(f"Assembling {len(chunk_results)} transcription chunks")
    
    full_text = ""
    all_segments = []
    all_words = []
    
    for i, (result, chunk_info) in enumerate(zip(chunk_results, chunk_info_list)):
        chunk_text = result.get('text', '').strip()
        
        # Skip empty results
        if not chunk_text:
            continue
        
        if i > 0:
            # Handle overlap removal
            overlap_duration = chunk_info['start'] - chunk_info['logical_start']
            if overlap_duration > 0:
                # Remove overlapping content based on word or segment timestamps
                filtered_segments = []
                for segment in result.get('segments', []):
                    if segment['start'] >= overlap_duration:
                        # Adjust segment timestamps
                        adjusted_segment = segment.copy()
                        adjusted_segment['start'] -= overlap_duration
                        adjusted_segment['end'] -= overlap_duration
                        filtered_segments.append(adjusted_segment)
                
                # Replace segments with filtered segments
                if filtered_segments:
                    result['segments'] = filtered_segments
                    
                    # Reconstruct text from filtered segments
                    chunk_text = ' '.join(segment['text'] for segment in filtered_segments)
        
        # Adjust timestamps to global timeline
        logical_start_offset = chunk_info['logical_start']
        
        # Process segments
        for segment in result.get('segments', []):
            adjusted_segment = segment.copy()
            adjusted_segment['start'] += logical_start_offset
            adjusted_segment['end'] += logical_start_offset
            all_segments.append(adjusted_segment)
        
        # Process words if available
        for segment in result.get('segments', []):
            for word in segment.get('words', []):
                adjusted_word = word.copy()
                adjusted_word['start'] += logical_start_offset
                adjusted_word['end'] += logical_start_offset
                all_words.append(adjusted_word)
        
        # Concatenate text
        if chunk_text:
            if full_text and not full_text.endswith(' '):
                full_text += ' '
            full_text += chunk_text
    
    # Sort segments by start time
    all_segments.sort(key=lambda s: s['start'])
    
    # Create final result
    final_result = {
        'text': full_text.strip(),
        'segments': all_segments,
    }
    
    if all_words:
        final_result['words'] = sorted(all_words, key=lambda w: w['start'])
    
    if chunk_results and chunk_results[0].get('language'):
        final_result['language'] = chunk_results[0].get('language')
    
    logger.info(f"Assembled transcription: {len(final_result['text'])} characters, {len(all_segments)} segments")
    return final_result


class TranscriptionCache:
    """Cache transcription results for resume capability"""
    
    def __init__(self, cache_dir: str):
        """
        Initialize the transcription cache
        
        Args:
            cache_dir: Directory to store cache files
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True, parents=True)
    
    def get_cache_key(self, job_id: str, chunk_index: int) -> str:
        """
        Generate cache key for chunk
        
        Args:
            job_id: Job ID
            chunk_index: Chunk index
            
        Returns:
            Cache key string
        """
        return f"{job_id}_chunk_{chunk_index:03d}"
    
    def get_cached_result(self, job_id: str, chunk_index: int) -> Optional[Dict]:
        """
        Retrieve cached transcription result
        
        Args:
            job_id: Job ID
            chunk_index: Chunk index
            
        Returns:
            Cached transcription result or None if not found
        """
        cache_key = self.get_cache_key(job_id, chunk_index)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading cached result: {e}")
        
        return None
    
    def cache_result(self, job_id: str, chunk_index: int, result: Dict):
        """
        Cache transcription result
        
        Args:
            job_id: Job ID
            chunk_index: Chunk index
            result: Transcription result
        """
        cache_key = self.get_cache_key(job_id, chunk_index)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(result, f, indent=2)
        except Exception as e:
            logger.error(f"Error caching result: {e}")


async def transcribe_long_audio_robust(
    audio_path: str, 
    job_id: str,
    language: Optional[str] = None,
    api_key: Optional[str] = None
) -> TranscriptionResult:
    """
    Transcribe audio files of any length using the Whisper API
    
    This function implements the robust transcription approach with intelligent
    chunking, size prediction, and context preservation.
    
    Args:
        audio_path: Path to audio file
        job_id: Job ID for progress tracking
        language: Language code
        api_key: OpenAI API key
        
    Returns:
        TranscriptionResult with combined results
    """
    logger.info(f"Starting robust transcription for {audio_path} (job_id: {job_id})")
    
    # Create temp directory for processing
    temp_dir = os.path.join(os.path.dirname(audio_path), f"robust_chunks_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Create cache directory for progress tracking
    cache_dir = os.path.join("progress", job_id)
    os.makedirs(cache_dir, exist_ok=True)
    
    # Initialize cache
    cache = TranscriptionCache(cache_dir)
    
    try:
        # Step 1: Optimize source audio
        logger.info("Optimizing source audio...")
        optimized_path = os.path.join(temp_dir, "optimized_input.mp3")
        
        # Check if optimization is needed based on file size
        source_size_mb = get_file_size_mb(audio_path)
        if source_size_mb > MAX_FILE_SIZE_MB:
            # Apply optimization
            optimized_audio = optimize_audio_aggressively(audio_path, target_size_mb=MAX_FILE_SIZE_MB * 0.9)
            shutil.copy(optimized_audio, optimized_path)
            os.unlink(optimized_audio)  # Clean up temporary file
        else:
            # Just copy the file if it's already small enough
            shutil.copy(audio_path, optimized_path)
        
        # Step 2: Create intelligent chunks
        logger.info("Creating intelligent chunks...")
        chunks = create_intelligent_chunks(optimized_path)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Step 3: Extract and validate chunks
        chunk_paths = []
        for chunk_info in chunks:
            chunk_path = await extract_audio_chunk(optimized_path, chunk_info, temp_dir)
            chunk_info['path'] = chunk_path
            chunk_paths.append(chunk_path)
        
        # Step 4: Initialize API client
        api_client = WhisperAPIClient(api_key)
        chunk_results = []
        
        # Build context prompt from previous chunks
        context_prompt = ""
        
        # Step 5: Transcribe chunks with context preservation
        for i, chunk_info in enumerate(chunks):
            logger.info(f"Processing chunk {i+1}/{len(chunks)}")
            
            # Check if chunk result is already cached
            cached_result = cache.get_cached_result(job_id, chunk_info['index'])
            if cached_result:
                logger.info(f"Using cached result for chunk {i+1}")
                chunk_results.append(cached_result)
                
                # Update context prompt
                if cached_result.get('text'):
                    sentences = cached_result['text'].split('.')[-3:]  # Last 3 sentences
                    context_prompt = '. '.join(s.strip() for s in sentences if s.strip())
                    context_prompt = context_prompt[:200]  # Keep under limit
                
                continue
            
            try:
                # Transcribe chunk
                result = await api_client.transcribe_chunk(
                    chunk_info['path'], 
                    chunk_info,
                    language=language,
                    prompt=context_prompt
                )
                
                # Cache result
                cache.cache_result(job_id, chunk_info['index'], result)
                chunk_results.append(result)
                
                # Update context prompt with last few sentences
                if result.get('text'):
                    sentences = result['text'].split('.')[-3:]  # Last 3 sentences
                    context_prompt = '. '.join(s.strip() for s in sentences if s.strip())
                    context_prompt = context_prompt[:200]  # Keep under limit
                
            except Exception as e:
                logger.error(f"Failed to transcribe chunk {i+1}: {e}")
                raise
        
        # Step 6: Assemble final transcription
        logger.info("Assembling final transcription...")
        final_result_dict = assemble_transcription(chunk_results, chunks)
        
        # Convert to TranscriptionResult
        segments = []
        for segment in final_result_dict.get('segments', []):
            segments.append(TranscriptSegment(
                text=segment.get('text', '').strip(),
                start=segment.get('start', 0),
                end=segment.get('end', 0),
                words=segment.get('words', [])
            ))
        
        transcription = TranscriptionResult(
            segments=segments,
            text=final_result_dict.get('text', ''),
            source="openai-whisper-api",
            language=final_result_dict.get('language', language)
        )
        
        logger.info(f"Transcription completed: {len(transcription.text)} characters")
        return transcription
        
    finally:
        # Cleanup temporary files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)