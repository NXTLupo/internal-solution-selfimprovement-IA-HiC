# Video Analyzer Transcription Pipeline

This document details the transcription pipeline for the NXT Humans AI Video Analyzer, focusing on YouTube video ingestion and Whisper-based transcription.

## Pipeline Overview

The transcription pipeline follows these steps:

1. **Input Validation** - Verify YouTube URL or video file
2. **Video/Audio Extraction** - Download video or extract audio
3. **Caption Retrieval Attempt** - Try to fetch existing captions
4. **Whisper Transcription** - Generate transcript if captions unavailable
5. **Post-Processing** - Clean and format transcript with timestamps
6. **Storage** - Save transcript for analysis and retrieval

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Input        │     │  YouTube      │     │  Caption      │
│  Validation   │────►│  Extraction   │────►│  Retrieval    │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                    │
                                                    ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Transcript   │     │  Whisper      │     │  Caption      │
│  Storage      │◄────│  Transcription│◄────│  Available?   │
└───────────────┘     └───────────────┘     └───────────────┘
                           ▲    │                   │
                           │    │                   │
                           └────┘                   ▼
                      No Captions               Use Captions
```

## Component Details

### 1. Input Validation

Validate the input to ensure it's a valid YouTube URL or supported video file.

```python
def validate_youtube_url(url: str) -> bool:
    """Validate if the URL is a valid YouTube URL."""
    youtube_regex = (
        r'(https?://)?(www\.)?'
        r'(youtube|youtu|youtube-nocookie)\.(com|be)/'
        r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})')
    
    match = re.match(youtube_regex, url)
    return match is not None

def validate_video_file(file_path: str) -> bool:
    """Validate if the file is a supported video format."""
    valid_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    file_extension = os.path.splitext(file_path)[1].lower()
    
    # Check extension
    if file_extension not in valid_extensions:
        return False
    
    # Check file exists
    if not os.path.exists(file_path):
        return False
        
    # Check file size (e.g., limit to 500MB)
    if os.path.getsize(file_path) > 500 * 1024 * 1024:
        return False
        
    return True
```

### 2. Video/Audio Extraction

Use `yt-dlp` to download YouTube videos or extract audio.

```python
def download_youtube_video(youtube_url: str, output_path: str) -> str:
    """
    Download YouTube video or extract audio using yt-dlp.
    
    Args:
        youtube_url: The YouTube URL
        output_path: Directory to save the file
        
    Returns:
        Path to the downloaded audio file
    """
    # Create unique ID for this download
    video_id = extract_video_id(youtube_url)
    output_file = os.path.join(output_path, f"{video_id}.mp3")
    
    # Only download audio to save bandwidth and storage
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_file,
        'quiet': True,
        'no_warnings': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
            
        return output_file
    except Exception as e:
        logger.error(f"Error downloading YouTube video: {e}")
        raise ValueError(f"Failed to download YouTube video: {e}")
```

### 3. Caption Retrieval

Try to fetch existing YouTube captions before transcription.

```python
def fetch_youtube_captions(youtube_url: str) -> Optional[List[dict]]:
    """
    Attempt to fetch existing captions from YouTube.
    
    Returns:
        List of caption segments with text and timestamps,
        or None if captions couldn't be retrieved
    """
    try:
        # Use youtube_transcript_api to fetch captions
        from youtube_transcript_api import YouTubeTranscriptApi
        video_id = extract_video_id(youtube_url)
        
        # Try to get English captions first, fall back to auto-generated
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except:
            # Try auto-generated captions
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
        # Check if we got a valid transcript
        if transcript and len(transcript) > 0:
            return transcript  # List of dicts with 'text', 'start', 'duration'
            
    except Exception as e:
        logger.info(f"Could not fetch YouTube captions: {e}")
        
    return None
```

### 4. Whisper Transcription

Use OpenAI's Whisper model for transcription when captions are unavailable.

```python
def transcribe_with_whisper(audio_path: str, model_size: str = "large-v2") -> dict:
    """
    Transcribe audio using Whisper model.
    
    Args:
        audio_path: Path to audio file
        model_size: Whisper model size (tiny, base, small, medium, large-v2)
        
    Returns:
        Dictionary with transcription results including text and segments
    """
    try:
        # Load Whisper model (first run will download the model)
        model = whisper.load_model(model_size)
        
        # Transcribe audio
        logger.info(f"Starting Whisper transcription with model {model_size}")
        result = model.transcribe(
            audio_path,
            verbose=False,
            word_timestamps=True,  # Get word-level timestamps if available
            language="en"          # Can be auto-detected or specified
        )
        
        logger.info(f"Transcription complete: {len(result['text'])} characters")
        return result
        
    except Exception as e:
        logger.error(f"Error in Whisper transcription: {e}")
        raise RuntimeError(f"Transcription failed: {e}")
```

### 5. Post-Processing

Clean and format the transcript with proper timestamps.

```python
def process_transcript(
    transcript_data: Union[List[dict], dict],
    source_type: str = "whisper"
) -> List[dict]:
    """
    Process and normalize transcript data from different sources.
    
    Args:
        transcript_data: Raw transcript data (from Whisper or YouTube)
        source_type: Source of transcript ("whisper" or "youtube")
        
    Returns:
        Normalized list of transcript segments
    """
    segments = []
    
    if source_type == "whisper":
        # Process Whisper output
        for segment in transcript_data["segments"]:
            segments.append({
                "text": segment["text"].strip(),
                "start": segment["start"],
                "end": segment["end"],
                "words": segment.get("words", [])  # Word-level data if available
            })
    elif source_type == "youtube":
        # Process YouTube captions
        for segment in transcript_data:
            segments.append({
                "text": segment["text"].strip(),
                "start": segment["start"],
                "end": segment["start"] + segment["duration"],
                "words": []  # YouTube doesn't provide word-level timestamps
            })
    
    # Additional cleanup
    for segment in segments:
        # Remove excessive whitespace
        segment["text"] = re.sub(r'\s+', ' ', segment["text"]).strip()
        
        # Remove speaker labels if present (optional)
        segment["text"] = re.sub(r'^\[.*?\]:\s*', '', segment["text"])
    
    return segments
```

### 6. Storage

Save the transcript for analysis and retrieval.

```python
def save_transcript(
    segments: List[dict],
    video_id: str,
    output_dir: str
) -> dict:
    """
    Save transcript in multiple formats.
    
    Args:
        segments: Processed transcript segments
        video_id: YouTube video ID or unique identifier
        output_dir: Directory to save transcripts
        
    Returns:
        Dictionary with paths to saved files
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Base paths for different formats
    json_path = os.path.join(output_dir, f"{video_id}.json")
    txt_path = os.path.join(output_dir, f"{video_id}.txt")
    srt_path = os.path.join(output_dir, f"{video_id}.srt")
    
    # Save JSON (full data with timestamps)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(segments, f, ensure_ascii=False, indent=2)
    
    # Save plain text
    with open(txt_path, 'w', encoding='utf-8') as f:
        for segment in segments:
            f.write(f"{segment['text']}\n")
    
    # Save SRT (for subtitle display)
    with open(srt_path, 'w', encoding='utf-8') as f:
        for i, segment in enumerate(segments, 1):
            # Format: index, timestamp range, text
            start_time = format_timestamp(segment['start'])
            end_time = format_timestamp(segment['end'])
            
            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{segment['text']}\n\n")
    
    return {
        "json": json_path,
        "txt": txt_path,
        "srt": srt_path
    }

def format_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hours = int(seconds / 3600)
    seconds %= 3600
    minutes = int(seconds / 60)
    seconds %= 60
    milliseconds = int((seconds - int(seconds)) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{milliseconds:03d}"
```

## Main Pipeline Function

```python
async def transcribe_youtube_video(
    youtube_url: str,
    output_dir: str,
    model_size: str = "large-v2",
    preferred_language: str = "en",
    max_video_length: int = 7200  # 2 hours
) -> dict:
    """
    Main pipeline function to transcribe a YouTube video.
    
    Args:
        youtube_url: YouTube video URL
        output_dir: Directory to save outputs
        model_size: Whisper model size
        preferred_language: Preferred transcript language
        max_video_length: Maximum video length in seconds
        
    Returns:
        Dictionary with transcription results and file paths
    """
    # Step 1: Validate URL
    if not validate_youtube_url(youtube_url):
        raise ValueError("Invalid YouTube URL")
    
    video_id = extract_video_id(youtube_url)
    temp_dir = os.path.join(output_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Step 2: Try to fetch existing captions
        captions = fetch_youtube_captions(youtube_url)
        source_type = "youtube"
        
        # Step 3: If no captions, download and transcribe
        if not captions:
            # Download audio
            audio_path = download_youtube_video(youtube_url, temp_dir)
            
            # Get audio duration
            audio_duration = get_audio_duration(audio_path)
            if audio_duration > max_video_length:
                raise ValueError(f"Video exceeds maximum length of {max_video_length} seconds")
            
            # Transcribe with Whisper
            whisper_result = transcribe_with_whisper(audio_path, model_size)
            captions = whisper_result
            source_type = "whisper"
        
        # Step 4: Process transcript
        segments = process_transcript(captions, source_type)
        
        # Step 5: Save transcript
        file_paths = save_transcript(segments, video_id, output_dir)
        
        # Step 6: Return results
        return {
            "video_id": video_id,
            "url": youtube_url,
            "segments": segments,
            "segment_count": len(segments),
            "duration": segments[-1]["end"] if segments else 0,
            "file_paths": file_paths,
            "source": source_type
        }
        
    finally:
        # Clean up temporary files
        try:
            shutil.rmtree(temp_dir)
        except:
            logger.warning(f"Could not clean up temporary directory: {temp_dir}")
```

## Direct Video File Processing

In addition to YouTube URLs, the pipeline can handle direct video file uploads:

```python
async def transcribe_video_file(
    file_path: str,
    output_dir: str,
    model_size: str = "large-v2",
    preferred_language: str = "en",
    max_video_length: int = 7200  # 2 hours
) -> dict:
    """
    Transcribe an uploaded video file.
    
    Args:
        file_path: Path to video file
        output_dir: Directory to save outputs
        model_size: Whisper model size
        preferred_language: Preferred transcript language
        max_video_length: Maximum video length in seconds
        
    Returns:
        Dictionary with transcription results and file paths
    """
    # Step 1: Validate file
    if not validate_video_file(file_path):
        raise ValueError("Invalid video file")
    
    # Generate a unique ID for this file
    file_id = str(uuid.uuid4())
    temp_dir = os.path.join(output_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Extract audio using FFmpeg
        audio_path = os.path.join(temp_dir, f"{file_id}.mp3")
        extract_audio_from_video(file_path, audio_path)
        
        # Get audio duration
        audio_duration = get_audio_duration(audio_path)
        if audio_duration > max_video_length:
            raise ValueError(f"Video exceeds maximum length of {max_video_length} seconds")
        
        # Transcribe with Whisper
        whisper_result = transcribe_with_whisper(audio_path, model_size)
        
        # Process transcript
        segments = process_transcript(whisper_result, "whisper")
        
        # Save transcript
        file_paths = save_transcript(segments, file_id, output_dir)
        
        # Return results
        return {
            "file_id": file_id,
            "original_filename": os.path.basename(file_path),
            "segments": segments,
            "segment_count": len(segments),
            "duration": segments[-1]["end"] if segments else 0,
            "file_paths": file_paths,
            "source": "whisper"
        }
        
    finally:
        # Clean up temporary files
        try:
            shutil.rmtree(temp_dir)
        except:
            logger.warning(f"Could not clean up temporary directory: {temp_dir}")
```

## Helper Functions

```python
def extract_video_id(youtube_url: str) -> str:
    """Extract YouTube video ID from URL."""
    # Match various YouTube URL formats
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)',
        r'(?:youtube\.com\/embed\/)([^\/\?]+)',
        r'(?:youtube\.com\/v\/)([^\/\?]+)',
        r'(?:youtube\.com\/user\/\w+\/\w+\/\w+\/)([^&\?]+)',
        r'(?:youtube\.com\/\w+\/\w+\/\w+\/)([^&\?]+)',
        r'(?:youtube\.com\/shorts\/)([^\/\?]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    raise ValueError(f"Could not extract video ID from URL: {youtube_url}")

def get_audio_duration(audio_path: str) -> float:
    """Get the duration of an audio file in seconds."""
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", 
           "-of", "default=noprint_wrappers=1:nokey=1", audio_path]
    
    output = subprocess.check_output(cmd).decode('utf-8').strip()
    return float(output)

def extract_audio_from_video(video_path: str, audio_path: str) -> None:
    """Extract audio from video file using FFmpeg."""
    cmd = ["ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", 
           "-vn", audio_path, "-y"]
    
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
```

## Error Handling and Logging

Implement robust error handling and logging to track pipeline progress:

```python
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("transcription_pipeline.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("transcription_pipeline")

# Custom exceptions
class TranscriptionError(Exception):
    """Base exception for transcription pipeline errors."""
    pass

class YouTubeExtractionError(TranscriptionError):
    """Error extracting content from YouTube."""
    pass

class WhisperTranscriptionError(TranscriptionError):
    """Error during Whisper transcription."""
    pass

class VideoProcessingError(TranscriptionError):
    """Error processing video file."""
    pass
```

## Pipeline Optimization

For improved performance, consider these optimizations:

1. **Chunking for Long Videos**: Split long videos into chunks for parallel processing.

```python
def chunk_audio_for_transcription(audio_path: str, chunk_dir: str, 
                                  chunk_size: int = 600) -> List[str]:
    """
    Split audio into chunks for parallel processing.
    
    Args:
        audio_path: Path to audio file
        chunk_dir: Directory to save chunks
        chunk_size: Chunk size in seconds
        
    Returns:
        List of paths to audio chunks
    """
    os.makedirs(chunk_dir, exist_ok=True)
    
    # Get audio duration
    duration = get_audio_duration(audio_path)
    
    # Calculate number of chunks
    num_chunks = math.ceil(duration / chunk_size)
    chunk_paths = []
    
    # Split audio into chunks
    for i in range(num_chunks):
        start_time = i * chunk_size
        chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.mp3")
        
        # Use FFmpeg to extract chunk
        cmd = [
            "ffmpeg", "-i", audio_path, 
            "-ss", str(start_time), 
            "-t", str(min(chunk_size, duration - start_time)),
            "-c:a", "copy", chunk_path, "-y"
        ]
        
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, 
                             stderr=subprocess.DEVNULL)
        chunk_paths.append(chunk_path)
    
    return chunk_paths
```

2. **Parallel Processing**: Use asyncio or multiprocessing for parallel transcription.

```python
async def transcribe_chunks_parallel(
    chunk_paths: List[str], 
    model_size: str = "large-v2"
) -> List[dict]:
    """
    Transcribe audio chunks in parallel using asyncio.
    
    Args:
        chunk_paths: List of paths to audio chunks
        model_size: Whisper model size
        
    Returns:
        List of transcription results for each chunk
    """
    # Create a semaphore to limit concurrent transcriptions
    # to avoid GPU memory issues
    semaphore = asyncio.Semaphore(2)  # Adjust based on GPU memory
    
    async def transcribe_chunk(chunk_path: str) -> dict:
        async with semaphore:
            # Run Whisper in a separate process to avoid GPU memory issues
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, lambda: whisper.load_model(model_size).transcribe(chunk_path)
            )
    
    # Create tasks for each chunk
    tasks = [transcribe_chunk(path) for path in chunk_paths]
    
    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks)
    return results
```

3. **Memory Management**: Unload models when not in use to free GPU memory.

```python
def transcribe_with_whisper_managed(audio_path: str, model_size: str = "large-v2") -> dict:
    """
    Transcribe audio with Whisper, ensuring proper model cleanup.
    """
    try:
        # Load model
        model = whisper.load_model(model_size)
        
        # Transcribe
        result = model.transcribe(audio_path)
        
        return result
    finally:
        # Force cleanup
        import gc
        import torch
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
```

## Dependencies

The transcription pipeline requires the following dependencies:

```
# Python 3.9+
openai-whisper>=20230314
yt-dlp>=2023.3.4
youtube-transcript-api>=0.6.0
ffmpeg-python>=0.2.0
torch>=2.0.0
numpy>=1.22.0
pydub>=0.25.1
```

Also requires FFmpeg to be installed on the system.

## Conclusion

This transcription pipeline provides a robust solution for processing YouTube videos and direct video uploads. It first attempts to fetch existing captions before falling back to Whisper transcription, optimizing for both speed and accuracy. The pipeline handles error cases gracefully and includes optimizations for processing longer videos efficiently.

For integration with the Analysis Pipeline, the transcription output (particularly the JSON format with timestamps) will be used as input for the LLM-based analysis functions. The transcript segments enable analysis across the full video while maintaining temporal context.