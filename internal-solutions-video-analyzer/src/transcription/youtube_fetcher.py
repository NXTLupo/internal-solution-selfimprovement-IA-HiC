import re
import os
import logging
import json
import subprocess
import asyncio
from typing import Dict, Optional, Any, List, Tuple
import yt_dlp
from ..models import VideoInfo

logger = logging.getLogger("video-analyzer.youtube_fetcher")

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
            video_id = match.group(1)
            logger.info(f"Extracted video ID {video_id} from URL: {youtube_url}")
            return video_id
    
    error_msg = f"Could not extract video ID from URL: {youtube_url}"
    logger.error(error_msg)
    raise ValueError(error_msg)

async def fetch_video_info(youtube_url: str) -> VideoInfo:
    """
    Fetch metadata about a YouTube video.
    
    Args:
        youtube_url: YouTube video URL
        
    Returns:
        VideoInfo object with metadata
    """
    logger.info(f"Fetching video info for {youtube_url}")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
    }
    
    try:
        # Run yt-dlp in a separate process to avoid blocking
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            loop = asyncio.get_event_loop()
            info_dict = await loop.run_in_executor(None, lambda: ydl.extract_info(youtube_url, download=False))
            
            video_info = VideoInfo(
                title=info_dict.get('title'),
                duration=info_dict.get('duration'),
                channel=info_dict.get('uploader'),
                upload_date=info_dict.get('upload_date'),
                thumbnail_url=info_dict.get('thumbnail')
            )
            
            logger.info(f"Fetched info for video: {video_info.title} ({video_info.duration}s)")
            return video_info
            
    except Exception as e:
        logger.error(f"Error fetching video info: {str(e)}")
        raise RuntimeError(f"Failed to fetch video info: {str(e)}")

async def download_youtube_video(youtube_url: str, output_dir: str) -> str:
    """
    Download YouTube video or extract audio using yt-dlp.
    
    Args:
        youtube_url: The YouTube URL
        output_dir: Directory to save the file
        
    Returns:
        Path to the downloaded audio file
    """
    # Create unique ID for this download
    video_id = extract_video_id(youtube_url)
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"{video_id}")
    
    logger.info(f"Downloading video {video_id} to {output_dir}")
    
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
        loop = asyncio.get_event_loop()
        
        # Run yt-dlp in a separate process to avoid blocking
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            await loop.run_in_executor(None, lambda: ydl.download([youtube_url]))
            
        final_output_file = f"{output_file}.mp3"
        logger.info(f"Downloaded video audio to {final_output_file}")
        return final_output_file
        
    except Exception as e:
        logger.error(f"Error downloading YouTube video: {str(e)}")
        raise ValueError(f"Failed to download YouTube video: {str(e)}")

async def fetch_youtube_captions(youtube_url: str) -> Optional[List[Dict[str, Any]]]:
    """
    Attempt to fetch existing captions from YouTube.
    
    Returns:
        List of caption segments with text and timestamps,
        or None if captions couldn't be retrieved
    """
    try:
        # Use youtube_transcript_api to fetch captions
        # Import here to avoid dependency if not used
        from youtube_transcript_api import YouTubeTranscriptApi
        video_id = extract_video_id(youtube_url)
        
        logger.info(f"Attempting to fetch captions for video {video_id}")
        
        # Try to get English captions first, fall back to auto-generated
        try:
            transcript = await asyncio.to_thread(
                YouTubeTranscriptApi.get_transcript, video_id, languages=['en']
            )
            logger.info(f"Retrieved English captions for video {video_id}")
        except Exception:
            # Try auto-generated captions
            transcript = await asyncio.to_thread(
                YouTubeTranscriptApi.get_transcript, video_id
            )
            logger.info(f"Retrieved auto-generated captions for video {video_id}")
            
        # Check if we got a valid transcript
        if transcript and len(transcript) > 0:
            return transcript  # List of dicts with 'text', 'start', 'duration'
            
    except Exception as e:
        logger.info(f"Could not fetch YouTube captions: {e}")
        
    return None

def get_audio_duration(audio_path: str) -> float:
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

def extract_audio_from_video(video_path: str, audio_path: str) -> None:
    """Extract audio from video file using FFmpeg."""
    cmd = ["ffmpeg", "-i", video_path, "-q:a", "0", "-map", "a", 
           "-vn", audio_path, "-y"]
    
    try:
        subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logger.info(f"Extracted audio from {video_path} to {audio_path}")
    except Exception as e:
        logger.error(f"Error extracting audio: {str(e)}")
        raise RuntimeError(f"Failed to extract audio: {str(e)}")