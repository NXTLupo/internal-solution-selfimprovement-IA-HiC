import os
import logging
import asyncio
import time
import math
import json
import httpx
import shutil
import tempfile
import concurrent.futures
import subprocess
from typing import Dict, List, Optional, Any, Union, Tuple
from pydantic import BaseModel

from ..models import TranscriptionResult, TranscriptSegment
from .youtube_fetcher import get_audio_duration


# Import the Whisper API patch to enforce size limits
try:
    from . import whisper_api_patch
    logger.info("Loaded Whisper API patch to enforce size limits")
except Exception as e:
    logger.error(f"Failed to load Whisper API patch: {e}")
logger = logging.getLogger("video-analyzer.enhanced_whisper_api")

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

# Maximum file size for Whisper API (20 MB to be extra safe)
MAX_FILE_SIZE_MB = 10
# Default chunk duration (in seconds)
DEFAULT_CHUNK_DURATION = 600  # 10 minutes
# Maximum tokens for prompt parameter
MAX_PROMPT_TOKENS = 224  # ~180 words


def get_file_size_mb(file_path: str) -> float:
    """Get file size in megabytes"""
    return os.path.getsize(file_path) / (1024 * 1024)


def get_optimal_chunk_strategy(file_path: str) -> Tuple[float, str]:
    """
    Determine optimal chunking strategy based on file size and duration
    
    Returns:
        Tuple of (chunk_duration_seconds, chunking_reason)
    """
    # Get duration
    duration = get_audio_duration(file_path)
    
    # Get file size
    size_mb = get_file_size_mb(file_path)
    
    if size_mb <= MAX_FILE_SIZE_MB:
        # File is small enough to process in one go
        return duration, "no_chunking_needed"
    
    # Calculate audio bitrate to estimate size per second
    bytes_per_second = (size_mb * 1024 * 1024) / duration
    
    # Calculate how many seconds would fit in MAX_FILE_SIZE_MB
    size_based_chunk_duration = (MAX_FILE_SIZE_MB * 1024 * 1024) / bytes_per_second
    
    # Cap at 600 seconds (10 minutes) for context window reasons
    optimal_duration = min(DEFAULT_CHUNK_DURATION, size_based_chunk_duration)
    
    # Round down to be safe
    optimal_duration = math.floor(optimal_duration)
    
    logger.info(f"Determined optimal chunk duration: {optimal_duration}s based on file size {size_mb:.2f}MB and duration {duration:.2f}s")
    return optimal_duration, "size_based_chunking"


def force_split_audio_if_needed(input_path: str, output_dir: str, target_size_mb: float = 10) -> List[Dict[str, Any]]:
    """
    Emergency function to force split extremely problematic audio into tiny chunks
    This is only used as a last resort when normal chunking still produces files that are too large
    
    Args:
        input_path: Path to audio file
        output_dir: Directory to save chunks
        target_size_mb: Target size in MB for each chunk (defaults to 10MB)
        
    Returns:
        List of dictionaries with chunk info
    """
    logger.warning(f"EMERGENCY: Force splitting audio {input_path} into tiny chunks of {target_size_mb}MB")
    
    # Get audio duration
    duration = get_audio_duration(input_path)
    if duration == 0:
        logger.error(f"Could not determine duration of {input_path}")
        raise ValueError(f"Could not determine duration of {input_path}")
    
    # Get file size
    file_size_mb = get_file_size_mb(input_path)
    
    # Calculate chunk duration
    bytes_per_second = (file_size_mb * 1024 * 1024) / duration
    chunk_duration = (target_size_mb * 1024 * 1024) / bytes_per_second
    
    # Apply a safety factor of 0.6
    chunk_duration = chunk_duration * 0.6
    
    # Ensure at least 15 seconds per chunk
    chunk_duration = max(15, chunk_duration)
    
    # Round down to be safe
    chunk_duration = math.floor(chunk_duration)
    
    logger.warning(f"Force splitting {input_path} ({file_size_mb:.2f}MB, {duration:.2f}s) into chunks of {chunk_duration}s")
    
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
        output_path = os.path.join(output_dir, f"emergency_chunk_{i:03d}.mp3")
        
        # Extract chunk using ffmpeg with ultra-aggressive compression
        subprocess.check_call([
            "ffmpeg", "-i", input_path, 
            "-ss", str(start_time), 
            "-t", str(chunk_duration_actual),
            "-c:a", "libmp3lame",
            "-ac", "1",               # Mono
            "-ar", "16000",           # 16kHz sampling
            "-b:a", "8k",             # Ultra-low bitrate
            "-map_metadata", "-1",    # Remove metadata
            "-y",                     # Overwrite output
            output_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Get file size
        chunk_size_mb = get_file_size_mb(output_path)
        logger.info(f"Created emergency chunk {i+1}/{num_chunks}: {output_path} ({chunk_size_mb:.2f}MB)")
        
        chunks.append({
            "path": output_path,
            "offset": start_time,
            "duration": chunk_duration_actual,
            "index": i,
            "size_mb": chunk_size_mb
        })
    
    logger.info(f"Created {len(chunks)} emergency chunks in {output_dir}")
    return chunks

def optimize_audio_for_whisper(input_path: str, output_path: str) -> str:
    """
    Convert audio to optimal format for Whisper API
    
    Args:
        input_path: Input audio file path
        output_path: Output optimized audio file path
        
    Returns:
        Path to optimized audio file
    """
    try:
        # Use ffmpeg to convert to optimized format
        subprocess.check_call([
            'ffmpeg', '-i', input_path, 
            '-c:a', 'libmp3lame',     # MP3 codec
            '-ac', '1',               # Mono
            '-ar', '16000',           # 16kHz sampling
            '-b:a', '48k',            # Lower bitrate (48kbps) to reduce file size
            '-map_metadata', '-1',    # Remove metadata
            '-y',                     # Overwrite output
            output_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Check if file is still too large
        file_size_mb = get_file_size_mb(output_path)
        if file_size_mb > MAX_FILE_SIZE_MB:
            logger.warning(f"Optimized file still too large ({file_size_mb:.2f} MB). Further reducing quality.")
            
            # Create a temporary file for the second optimization pass
            second_pass_path = output_path + ".reduced.mp3"
            
            # Even more aggressive optimization
            subprocess.check_call([
                'ffmpeg', '-i', output_path, 
                '-c:a', 'libmp3lame',
                '-ac', '1',
                '-ar', '16000',
                '-b:a', '32k',        # Very low bitrate
                '-map_metadata', '-1',
                '-y',
                second_pass_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Replace original output with reduced version
            shutil.move(second_pass_path, output_path)
            logger.info(f"Further reduced audio quality to meet size limits")
        
        logger.info(f"Optimized audio: {input_path} → {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Failed to optimize audio: {e}")
        # If optimization fails, return original file
        return input_path


async def transcribe_chunk_with_retry(
    chunk_path: str,
    prompt: str = "",
    language: Optional[str] = None,
    model: str = "whisper-1",
    max_retries: int = 3,
    backoff_factor: int = 2
) -> Dict[str, Any]:
    """
    Transcribe audio chunk with retry logic
    
    Args:
        chunk_path: Path to audio chunk
        prompt: Transcription prompt (previous context)
        language: Language code
        model: Whisper model to use
        max_retries: Maximum number of retry attempts
        backoff_factor: Exponential backoff factor
        
    Returns:
        Transcription result dictionary
    """
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            result = await transcribe_with_openai_api(
                chunk_path, prompt=prompt, language=language, model=model
            )
            return result
        except Exception as e:
            last_exception = e
            # If not the last attempt, wait and retry
            if attempt < max_retries - 1:
                wait_time = backoff_factor ** attempt
                logger.warning(f"Transcription attempt {attempt+1} failed. Retrying in {wait_time}s: {str(e)}")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} transcription attempts failed: {str(e)}")
    
    raise last_exception or RuntimeError("Transcription failed after multiple attempts")


async def transcribe_with_openai_api(
    audio_path: str,
    prompt: str = "",
    language: Optional[str] = None,
    model: str = "whisper-1"
) -> Dict[str, Any]:
    """
    Transcribe audio using OpenAI's Whisper API.
    
    Args:
        audio_path: Path to audio file
        prompt: Optional prompt for context (max 224 tokens)
        language: Optional language code
        model: Whisper model to use (whisper-1)
        
    Returns:
        Dictionary with transcription results
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    logger.info(f"Transcribing audio with OpenAI Whisper API, model: {model}")
    
    # Get cleaned API key
    api_key = get_openai_api_key()
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set or invalid")
        
    # Prepare request payload
    form_data = {
        'model': model,
        'response_format': 'verbose_json'
    }
    
    if language:
        form_data["language"] = language
        
    if prompt:
        # Truncate prompt if needed
        words = prompt.split()
        if len(words) > 180:  # Approximately 224 tokens
            prompt = " ".join(words[-180:])
        form_data["prompt"] = prompt
    
    try:
        # Check file size
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
        if file_size_mb > MAX_FILE_SIZE_MB:
            error_msg = f"Audio file size ({file_size_mb:.2f} MB) exceeds Whisper API limit of {MAX_FILE_SIZE_MB} MB"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Use httpx for async HTTP requests with a stricter timeout
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Log before sending to API
            logger.info(f"Sending file ({file_size_mb:.2f} MB) to Whisper API")
            
            try:
                with open(audio_path, "rb") as audio_file:
                    # Create form data with file
                    files = {"file": (os.path.basename(audio_path), audio_file, "audio/mpeg")}
                    
                    # Send request to OpenAI API
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={
                            "Authorization": f"Bearer {api_key}"
                        },
                        data=form_data,
                        files=files
                    )
                    
                    # Check for errors
                    if response.status_code != 200:
                        logger.error(f"OpenAI API error: {response.text}")
                        
                        # Check specifically for 413 Content Too Large errors
                        if response.status_code == 413:
                            error_text = response.text
                            logger.error(f"File too large for Whisper API: {error_text}")
                            raise ValueError(f"File too large for Whisper API: {error_text}")
                        else:
                            raise Exception(f"OpenAI API error: {response.text}")
                    
                    # Parse response
                    result = response.json()
                    logger.info(f"Transcription complete, length: {len(result.get('text', ''))}")
                    
                    # Transform to match local whisper format
                    segments = []
                    for i, segment in enumerate(result.get("segments", [])):
                        segments.append({
                            "id": i,
                            "text": segment.get("text", "").strip(),
                            "start": segment.get("start", 0),
                            "end": segment.get("end", 0),
                            "words": segment.get("words", [])
                        })
                    
                    transformed_result = {
                        "text": result.get("text", ""),
                        "segments": segments,
                        "language": result.get("language", language)
                    }
                    
                    return transformed_result
            except httpx.RequestError as e:
                logger.error(f"HTTP request error: {str(e)}")
                raise ValueError(f"Error sending request to OpenAI API: {str(e)}")
            except Exception as e:
                logger.error(f"Error in Whisper API request: {str(e)}")
                raise
                
    except Exception as e:
        logger.error(f"Error using OpenAI Whisper API: {str(e)}")
        raise


def chunk_audio_by_size(
    audio_path: str,
    output_dir: str,
    max_chunk_duration: float
) -> List[Dict[str, Any]]:
    """
    Split audio into chunks based on size and duration constraints
    
    Args:
        audio_path: Path to audio file
        output_dir: Directory to save chunks
        max_chunk_duration: Maximum chunk duration in seconds
        
    Returns:
        List of dictionaries with chunk info: {
            "path": str, 
            "offset": float, 
            "duration": float,
            "index": int
        }
    """
    # Get audio duration
    duration = get_audio_duration(audio_path)
    
    # Start with a much smaller chunk duration (50% of calculated max) to be extra safe
    safe_chunk_duration = max(30, int(max_chunk_duration * 0.5))
    logger.info(f"Using safe chunk duration of {safe_chunk_duration}s (from calculated {max_chunk_duration}s)")
    
    # Calculate number of chunks
    num_chunks = math.ceil(duration / safe_chunk_duration)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Process each chunk
    chunks = []
    chunk_index = 0  # Use a separate index counter to handle potential chunk splitting
    
    for i in range(num_chunks):
        start_time = i * safe_chunk_duration
        chunk_duration = min(safe_chunk_duration, duration - start_time)
        
        # Skip zero-duration chunks
        if chunk_duration <= 0:
            continue
            
        # Define output paths
        raw_chunk_path = os.path.join(output_dir, f"raw_chunk_{i:03d}.mp3")
        optimized_chunk_path = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
        
        # Extract chunk using ffmpeg
        subprocess.check_call([
            "ffmpeg", "-i", audio_path, 
            "-ss", str(start_time), 
            "-t", str(chunk_duration),
            "-c:a", "copy", raw_chunk_path, "-y"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Optimize for Whisper API
        optimize_audio_for_whisper(raw_chunk_path, optimized_chunk_path)
        
        # Check optimized file size
        size_mb = get_file_size_mb(optimized_chunk_path)
        
        # If the chunk is still too large after optimization, split it further
        if size_mb > MAX_FILE_SIZE_MB:
            logger.warning(f"Chunk {i} still too large ({size_mb:.2f} MB) after optimization. Splitting further.")
            
            # Remove the oversized chunk
            os.remove(optimized_chunk_path)
            
            # Calculate a more aggressive sub-chunk duration
            subchunk_count = math.ceil(size_mb / (MAX_FILE_SIZE_MB * 0.6))  # Aim for 80% of max size
            subchunk_duration = chunk_duration / subchunk_count
            
            logger.info(f"Splitting chunk {i} into {subchunk_count} subchunks of {subchunk_duration:.2f}s each")
            
            # Create sub-chunks
            for j in range(subchunk_count):
                subchunk_start = start_time + (j * subchunk_duration)
                subchunk_duration_actual = min(subchunk_duration, (start_time + chunk_duration) - subchunk_start)
                
                # Skip zero-duration sub-chunks
                if subchunk_duration_actual <= 0:
                    continue
                
                # Define sub-chunk paths
                sub_raw_path = os.path.join(output_dir, f"raw_subchunk_{i}_{j}.mp3")
                sub_optimized_path = os.path.join(output_dir, f"chunk_{chunk_index:03d}.mp3")
                
                # Extract sub-chunk using ffmpeg
                subprocess.check_call([
                    "ffmpeg", "-i", audio_path, 
                    "-ss", str(subchunk_start), 
                    "-t", str(subchunk_duration_actual),
                    "-c:a", "libmp3lame",     # Directly encode to MP3
                    "-ac", "1",               # Mono
                    "-ar", "16000",           # 16kHz sampling
                    "-b:a", "32k",            # Very low bitrate
                    sub_raw_path, "-y"
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
                # Optimize with even more aggressive settings
                optimize_audio_for_whisper(sub_raw_path, sub_optimized_path)
                
                # Check final size
                final_size_mb = get_file_size_mb(sub_optimized_path)
                
                if final_size_mb > MAX_FILE_SIZE_MB:
                    logger.error(f"Sub-chunk {chunk_index} still too large ({final_size_mb:.2f} MB). Using extremely aggressive compression.")
                    
                    # Last resort - use very aggressive settings
                    subprocess.check_call([
                        "ffmpeg", "-i", sub_optimized_path, 
                        "-c:a", "libmp3lame",
                        "-ac", "1",
                        "-ar", "16000",
                        "-b:a", "8k",        # Extremely low bitrate
                        "-map_metadata", "-1",
                        "-y",
                        sub_optimized_path + ".final.mp3"
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    
                    # Replace original output with extremely reduced version
                    shutil.move(sub_optimized_path + ".final.mp3", sub_optimized_path)
                    final_size_mb = get_file_size_mb(sub_optimized_path)
                    logger.info(f"Final sub-chunk size: {final_size_mb:.2f} MB")
                
                # Add to chunks list
                chunks.append({
                    "path": sub_optimized_path,
                    "offset": subchunk_start,
                    "duration": subchunk_duration_actual,
                    "index": chunk_index,
                    "size_mb": final_size_mb
                })
                
                # Increment chunk index
                chunk_index += 1
                
                # Clean up
                if os.path.exists(sub_raw_path):
                    os.remove(sub_raw_path)
        else:
            # Add to chunks list
            chunks.append({
                "path": optimized_chunk_path,
                "offset": start_time,
                "duration": chunk_duration,
                "index": chunk_index,
                "size_mb": size_mb
            })
            
            # Increment chunk index
            chunk_index += 1
        
        # Remove raw chunk to save space
        if os.path.exists(raw_chunk_path):
            os.remove(raw_chunk_path)
    
    logger.info(f"Split audio into {len(chunks)} chunks based on size constraints")
    return chunks


def save_progress(job_id: str, chunk_index: int, result: Dict[str, Any]) -> None:
    """Save partial results to allow resuming"""
    progress_dir = os.path.join("progress", job_id)
    os.makedirs(progress_dir, exist_ok=True)
    
    with open(os.path.join(progress_dir, f"chunk_{chunk_index:03d}.json"), "w") as f:
        json.dump(result, f)


def can_resume_job(job_id: str) -> bool:
    """Check if job has partial results to resume from"""
    progress_dir = os.path.join("progress", job_id)
    return os.path.exists(progress_dir)


def get_last_completed_chunk(job_id: str) -> int:
    """Get index of last completed chunk"""
    progress_dir = os.path.join("progress", job_id)
    if not os.path.exists(progress_dir):
        return -1
    
    import glob
    import re
    
    files = glob.glob(os.path.join(progress_dir, "chunk_*.json"))
    if not files:
        return -1
    
    indices = []
    for f in files:
        match = re.search(r'chunk_(\d+)\.json', f)
        if match:
            indices.append(int(match.group(1)))
    
    return max(indices) if indices else -1


def load_saved_chunk(job_id: str, chunk_index: int) -> Optional[Dict[str, Any]]:
    """Load saved chunk result"""
    progress_dir = os.path.join("progress", job_id)
    chunk_file = os.path.join(progress_dir, f"chunk_{chunk_index:03d}.json")
    
    if os.path.exists(chunk_file):
        with open(chunk_file, 'r') as f:
            return json.load(f)
    
    return None


async def transcribe_long_audio(
    audio_path: str,
    job_id: str,
    language: Optional[str] = None,
    model: str = "whisper-1",
) -> TranscriptionResult:
    """
    Transcribe audio files of any length by intelligently chunking based on size limits
    
    This function is designed to handle both short and long videos automatically:
    - For short videos that are already under the size limit, it sends them directly to the API
    - For longer videos, it automatically splits them into appropriately sized chunks
    - The chunking strategy is adaptive, based on the actual file size rather than duration
    
    Args:
        audio_path: Path to audio file
        job_id: Unique job identifier for progress tracking
        language: Language code
        model: Whisper model to use
        
    Returns:
        TranscriptionResult with combined results
    """
    # Create temp directory for chunks
    temp_dir = os.path.join(os.path.dirname(audio_path), f"chunks_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Create progress directory
    progress_dir = os.path.join("progress", job_id)
    os.makedirs(progress_dir, exist_ok=True)
    
    try:
        # Optimize input audio first
        optimized_audio = os.path.join(temp_dir, "optimized_input.mp3")
        optimize_audio_for_whisper(audio_path, optimized_audio)
        
        # Get optimal chunk strategy
        chunk_duration, strategy = get_optimal_chunk_strategy(optimized_audio)
        
        # If file is small enough, transcribe directly
        if strategy == "no_chunking_needed":
            logger.info(f"Audio file is small enough to transcribe directly")
            api_result = await transcribe_chunk_with_retry(
                optimized_audio, prompt="", language=language, model=model
            )
            
            # Convert to our model format
            segments = []
            for segment in api_result["segments"]:
                segments.append(TranscriptSegment(
                    text=segment["text"].strip(),
                    start=segment["start"],
                    end=segment["end"],
                    words=segment.get("words", [])
                ))
            
            return TranscriptionResult(
                segments=segments,
                text=api_result["text"],
                source="openai-whisper-api",
                language=api_result.get("language", language)
            )
        
        # Split audio into chunks based on size constraints
        # Try normal chunking first
        try:
            chunks = chunk_audio_by_size(optimized_audio, temp_dir, chunk_duration)
            
            # If any chunks are still too large after optimization, use emergency force splitting
            oversized_chunks = [c for c in chunks if c["size_mb"] > MAX_FILE_SIZE_MB]
            if oversized_chunks:
                logger.warning(f"Found {len(oversized_chunks)} chunks still over size limit after normal chunking")
                
                # Use emergency force splitting on the entire file
                emergency_dir = os.path.join(temp_dir, "emergency_chunks")
                os.makedirs(emergency_dir, exist_ok=True)
                
                logger.warning("Switching to emergency force-splitting mode")
                chunks = force_split_audio_if_needed(
                    audio_path, 
                    emergency_dir, 
                    target_size_mb=MAX_FILE_SIZE_MB * 0.7  # Target 70% of max size
                )
        except Exception as e:
            logger.error(f"Error during normal chunking: {e}")
            # Fall back to emergency chunking
            emergency_dir = os.path.join(temp_dir, "emergency_chunks")
            os.makedirs(emergency_dir, exist_ok=True)
            
            logger.warning("Falling back to emergency force-splitting mode")
            chunks = force_split_audio_if_needed(
                audio_path, 
                emergency_dir, 
                target_size_mb=MAX_FILE_SIZE_MB * 0.7  # Target 70% of max size
            )
        
        # Check for resumable job
        last_completed = get_last_completed_chunk(job_id)
        if last_completed >= 0:
            logger.info(f"Resuming job {job_id} from chunk {last_completed + 1}")
        
        # Process chunks sequentially to maintain context
        results = []
        previous_text = ""
        
        for chunk in chunks:
            chunk_index = chunk["index"]
            
            # Skip already processed chunks
            if chunk_index <= last_completed:
                # Load saved result
                saved_result = load_saved_chunk(job_id, chunk_index)
                if saved_result:
                    results.append(saved_result)
                    previous_text = saved_result["text"]
                    logger.info(f"Loaded saved result for chunk {chunk_index}")
                    continue
            
            # Process this chunk
            logger.info(f"Transcribing chunk {chunk_index+1}/{len(chunks)}, "
                       f"size: {chunk['size_mb']:.2f}MB, offset: {chunk['offset']}s")
            
            # Final size check before sending to API
            if chunk["size_mb"] > MAX_FILE_SIZE_MB:
                logger.error(f"CRITICAL: Chunk {chunk_index} is still too large ({chunk['size_mb']:.2f}MB). "
                            f"Skipping this chunk and continuing with the next one.")
                continue
            
            # Use previous text as prompt for context
            try:
                result = await transcribe_chunk_with_retry(
                    chunk["path"], 
                    prompt=previous_text,
                    language=language, 
                    model=model
                )
                
                # Adjust timestamps by offset
                for segment in result["segments"]:
                    segment["start"] += chunk["offset"]
                    segment["end"] += chunk["offset"]
                    
                    # Also adjust word timestamps if available
                    if "words" in segment and segment["words"]:
                        for word in segment["words"]:
                            word["start"] += chunk["offset"]
                            word["end"] += chunk["offset"]
                
                # Save progress
                save_progress(job_id, chunk_index, result)
                
                # Update for next iteration
                results.append(result)
                previous_text = result["text"]
                
            except Exception as e:
                logger.error(f"Error transcribing chunk {chunk_index}: {e}")
                # Continue with next chunk
                continue
        
        # Combine results
        combined_text = " ".join(r["text"] for r in results)
        
        # Combine segments
        all_segments = []
        for result in results:
            all_segments.extend(result["segments"])
        
        # Sort segments by start time
        all_segments.sort(key=lambda s: s["start"])
        
        # Create TranscriptionResult
        segments = []
        for segment in all_segments:
            segments.append(TranscriptSegment(
                text=segment["text"].strip(),
                start=segment["start"],
                end=segment["end"],
                words=segment.get("words", [])
            ))
        
        transcription = TranscriptionResult(
            segments=segments,
            text=combined_text,
            source="openai-whisper-api",
            language=results[0].get("language", language) if results else language
        )
        
        logger.info(f"Transcription complete: {len(transcription.text)} characters from {len(chunks)} chunks")
        return transcription
        
    finally:
        # Clean up temporary files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)