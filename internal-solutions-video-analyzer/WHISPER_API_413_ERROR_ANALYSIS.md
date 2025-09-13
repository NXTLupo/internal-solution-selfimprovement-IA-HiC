# Whisper API 413 Error Analysis

## Issue Description

Despite multiple fixes and optimizations, the Video Transcriber is still encountering 413 Content Too Large errors when attempting to process large YouTube videos. This document provides a comprehensive analysis of the issue for further troubleshooting.

## Error Details

```
Error: Error code: 413 - {'error': {'message': '413: Maximum content size limit (26214400) exceeded (26443064 bytes read)', 'type': 'server_error', 'param': None, 'code': None}}
```

This indicates that OpenAI's Whisper API is receiving files larger than its 25MB limit (26,214,400 bytes), despite our attempts to keep files under this limit.

## Current Implementation

### 1. Size Limit Constants

The application sets a maximum file size limit:

```python
# In src/transcription/enhanced_whisper_api.py
MAX_FILE_SIZE_MB = 10  # Recently reduced from 15MB to 10MB
```

### 2. Main Transcription Process

The primary transcription flow:

```python
# In src/app.py
async def transcribe_with_selected_method(
    audio_path: str,
    language: Optional[str] = None,
    is_long_audio: bool = False,
    job_id: Optional[str] = None
) -> TranscriptionResult:
    if USE_WHISPER_API:
        logger.info("Transcribing with OpenAI Whisper API")
        
        # Always use enhanced API with size-based chunking for all videos
        if job_id:
            logger.info("Using enhanced Whisper API with adaptive chunking")
            return await transcribe_long_audio(audio_path, job_id, language)
        else:
            # Fallback only if no job_id provided (should be rare)
            logger.warning("No job_id provided, using fallback transcription method")
            if is_long_audio:
                return await transcribe_audio_chunks_with_api(audio_path, language)
            else:
                return await transcribe_audio_with_api(audio_path, language)
```

### 3. Chunking Logic

The system uses size-based chunking:

```python
# In src/transcription/enhanced_whisper_api.py
async def transcribe_long_audio(audio_path: str, job_id: str, language: Optional[str] = None, model: str = "whisper-1") -> TranscriptionResult:
    # ...
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
    # ...
```

### 4. Audio Optimization

Multiple levels of audio optimization are applied:

```python
# In src/transcription/enhanced_whisper_api.py
def optimize_audio_for_whisper(input_path: str, output_path: str) -> str:
    # ...
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
    # ...
```

### 5. Emergency Size Reduction

Additional emergency reduction is applied just before API calls:

```python
# In src/transcription/enhanced_whisper_api.py
async def transcribe_with_openai_api(audio_path: str, prompt: str = "", language: Optional[str] = None, model: str = "whisper-1") -> Dict[str, Any]:
    # ...
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
    # ...
```

### 6. HTTP Client Patching

A final attempt was made to intercept the HTTP requests:

```python
# In src/transcription/whisper_api_patch.py
async def patched_post(self, url: str, *args: Any, **kwargs: Any) -> httpx.Response:
    # Only intercept Whisper API calls
    if 'api.openai.com/v1/audio/transcriptions' in url:
        logger.info("Intercepting Whisper API call to enforce size limits")
        
        # Check if we have files in the request
        files = kwargs.get('files', {})
        if files:
            # Get the file object
            for key, file_tuple in files.items():
                if len(file_tuple) >= 2 and hasattr(file_tuple[1], 'seek') and hasattr(file_tuple[1], 'tell'):
                    file_obj = file_tuple[1]
                    
                    # Get file size
                    current_pos = file_obj.tell()
                    file_obj.seek(0, os.SEEK_END)
                    file_size = file_obj.tell()
                    file_obj.seek(current_pos)  # Restore position
                    
                    logger.info(f"File size: {file_size / 1024 / 1024:.2f}MB")
                    
                    # Check if file is too large
                    if file_size > MAX_SIZE_BYTES:
                        logger.error(f"File size ({file_size / 1024 / 1024:.2f}MB) exceeds limit ({MAX_SIZE_BYTES / 1024 / 1024:.2f}MB)")
                        
                        # Create a fake 413 response
                        error_json = {
                            "error": {
                                "message": f"INTERCEPTED: File size ({file_size / 1024 / 1024:.2f}MB) exceeds maximum size ({MAX_SIZE_BYTES / 1024 / 1024:.2f}MB)",
                                "type": "file_too_large",
                                "param": None,
                                "code": "file_too_large"
                            }
                        }
                        
                        # Return a fake response without making the API call
                        return httpx.Response(
                            status_code=413,
                            content=str(error_json).encode(),
                            request=httpx.Request("POST", url)
                        )
```

## Potential Issues

1. **Size Measurement Discrepancy**:
   - The code measures file size on disk, but the API might be measuring memory size after loading
   - Multipart form data adds overhead not included in our size calculations
   - File size after loading into memory might be larger than on disk

2. **HTTP Client Patching Issues**:
   - The monkey patching of httpx might not be properly applied
   - The patched_post function may not be catching all cases
   - Import order issues could prevent the patch from being effective

3. **FFmpeg Optimization Ineffectiveness**:
   - Some audio content might be highly complex and resist compression
   - The lowest bitrate (8kbps) might still result in files larger than expected
   - The file size estimates after compression might be inaccurate

4. **HTTP Headers and Content-Type**:
   - Additional headers and content-type declarations add overhead
   - The multipart/form-data boundary strings add variable overhead

5. **In-Memory Transformations**:
   - The file might be transformed or expanded in memory before sending
   - Base64 encoding or other serialization might increase size

## Suggested Solutions

1. **Pre-Intercept File Opening**:
   - Patch the open() function to prevent files over 20MB from being opened
   - Implement a custom file-like object that strictly enforces size limits

2. **Direct FFmpeg to API Piping**:
   - Use FFmpeg to stream directly to the API without intermediate files
   - Implement a size-limiting buffer that fails early if limits are exceeded

3. **Alternative API Approach**:
   - Consider using Azure Speech API which supports files up to 1GB
   - Implement a local Whisper model fallback for extremely large files

4. **Client-Side Process**:
   - Move chunking and transcription logic to the client side
   - Process each chunk in the browser before sending to the server

5. **Lower Size Limit**:
   - Reduce MAX_FILE_SIZE_MB even further (e.g., to 5MB)
   - Add additional safety factors in all size calculations

## Log Analysis Required

To further debug this issue, detailed logging would be helpful:

1. Log the exact file size at each processing stage
2. Log the raw HTTP request size before sending
3. Capture the actual request that's failing with tcpdump or similar
4. Monitor memory usage during file processing and API calls

## Conclusion

The 413 Content Too Large error persists despite multiple levels of size limiting and optimization. This suggests there are fundamental issues with how file size is measured or how the data is being prepared for the API that our current approaches aren't addressing.

A more radical approach or completely different architecture might be needed to resolve this issue, potentially moving away from the OpenAI Whisper API for large files.