# Video Transcriptor - NXT Humans Intelligence Augmentation Suite

## 🎯 Overview

The Video Transcriptor is a comprehensive AI-powered transcription solution that transforms video and audio content into accurate, searchable text using OpenAI's Whisper API. It supports both YouTube URLs and direct file uploads, with advanced chunking capabilities for large files and real-time processing status updates.

## ✨ Key Features

### 🎥 Multi-Source Video Processing
- **YouTube Integration**: Direct URL transcription with automatic video extraction
- **File Upload Support**: MP4, AVI, MOV, WAV, MP3, and other common formats
- **Smart Chunking**: Automatic 25MB+ file segmentation for optimal processing
- **Format Detection**: Intelligent audio/video format recognition and conversion

### 🚀 Advanced Transcription Pipeline
- **OpenAI Whisper API**: State-of-the-art speech-to-text with 99+ language support
- **Parallel Processing**: Concurrent chunk processing for faster results
- **Error Recovery**: Robust retry mechanisms and fallback strategies
- **Quality Assurance**: Multi-stage validation and text cleanup

### 📊 Real-Time Processing
- **Status Tracking**: Live progress updates with detailed processing stages
- **JSON Export**: Structured transcript data with timestamps and metadata
- **Batch Processing**: Queue management for multiple simultaneous transcriptions
- **Resource Monitoring**: Memory and CPU optimization for large files

### 🔧 Technical Architecture
- **FastAPI Backend**: High-performance async processing with uvicorn ASGI server
- **FFmpeg Integration**: Professional audio/video processing and conversion
- **Secure File Handling**: Temporary file management with automatic cleanup
- **API Rate Management**: Intelligent Whisper API usage optimization

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Docker (optional, for containerized deployment)
- OpenAI API key with Whisper API access
- FFmpeg (for audio/video processing)

### Installation

#### Option 1: Standalone Installation
```bash
cd internal-solutions-video-analyzer
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install additional dependencies for enhanced functionality
pip install yt-dlp pytube pydub ffmpeg-python

# Set environment variables
export OPENAI_API_KEY=your_openai_api_key_here

# Start the service
python run.py        # Full featured version
# OR
python run-simple.py # Simplified version with fewer dependencies
```

#### Option 2: Docker Deployment
```bash
# From the workbench root directory
docker compose -f docker-compose-video-fixed.yml up -d
```

### Access the Application
- **Standalone**: http://localhost:5002
- **Docker**: http://localhost:5002
- **HTTPS (with proxy)**: https://localhost:8448

## 📖 Usage Guide

### 1. Upload Content

#### YouTube URLs
- **Supported Platforms**: YouTube, YouTube Music, and compatible video platforms
- **URL Formats**: Full URLs, shortened links, and video IDs
- **Quality Selection**: Automatic best quality audio extraction
- **Duration Limits**: Optimized for videos up to 2 hours

#### Direct File Upload
- **Supported Formats**: MP4, AVI, MOV, MKV, WAV, MP3, M4A, FLAC
- **File Size**: Up to 500MB per file with automatic chunking
- **Drag & Drop**: Simple file upload interface
- **Batch Upload**: Multiple files processing queue

### 2. Processing Pipeline

#### Stage 1: Content Preparation
- Video/audio extraction from source
- Format validation and conversion
- Quality optimization for transcription
- Metadata extraction and analysis

#### Stage 2: Chunking (Large Files)
- Automatic 25MB segment creation
- Overlap handling for seamless transcription
- Parallel chunk processing
- Progress tracking per segment

#### Stage 3: Whisper API Transcription
- High-accuracy speech-to-text conversion
- Multiple language detection and support
- Speaker identification (when possible)
- Timestamp generation for each segment

#### Stage 4: Post-Processing
- Text cleanup and formatting
- Chunk reassembly and synchronization
- Quality validation and error correction
- Final transcript generation

### 3. Results and Export

#### Transcription Output
- **Plain Text**: Clean, readable transcript
- **Timestamped**: Text with precise timing information
- **JSON Format**: Structured data with metadata and segments
- **Real-time Preview**: Live transcript updates during processing

#### Download Options
- **Text File**: `.txt` format for easy reading
- **JSON Export**: Structured data with timestamps and metadata
- **Copy to Clipboard**: Quick text copying functionality
- **Email Integration**: Send transcripts directly (if configured)

## 🔌 API Reference

### Health Check
```http
GET /health
```

### Start Transcription
```http
POST /api/transcribe
Content-Type: multipart/form-data

Parameters:
- url: YouTube URL (optional)
- file: Audio/video file (optional)
- language: Target language code (optional, auto-detect if not provided)
- format: Output format (text|json|both)
```

### Get Transcription Status
```http
GET /api/status/{job_id}
```

### Download Transcript
```http
GET /api/download/{job_id}
Content-Type: application/json or text/plain
```

### Get Processing Logs
```http
GET /api/logs/{job_id}
```

## ⚙️ Configuration

### Environment Variables
```bash
# OpenAI API Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here
WHISPER_MODEL=whisper-1                     # Whisper model version

# Service Configuration
PORT=5002
DEBUG=false
MAX_FILE_SIZE=500MB
CHUNK_SIZE=25MB

# Processing Configuration
MAX_CONCURRENT_CHUNKS=3
PROCESSING_TIMEOUT=1800s                   # 30 minutes
CLEANUP_INTERVAL=3600s                     # 1 hour

# Quality Settings
AUDIO_QUALITY=best
VIDEO_QUALITY=720p
SAMPLE_RATE=16000
```

### Advanced Configuration
Edit `src/config.py` for advanced settings:
- Whisper API parameters
- Chunk processing strategies
- File format preferences
- Error handling policies

## 📊 Performance & Monitoring

### Processing Metrics
- **Average Transcription Time**: 1-3 minutes per hour of audio
- **Supported File Size**: Up to 500MB with chunking
- **Concurrent Jobs**: Up to 5 simultaneous transcriptions
- **Language Support**: 99+ languages via Whisper API

### Quality Assurance
- **Accuracy Rate**: 95%+ for clear audio in supported languages
- **Format Support**: Universal audio/video format compatibility
- **Error Recovery**: Automatic retry with exponential backoff
- **Quality Monitoring**: Real-time processing quality assessment

## 🧪 Testing

### Run Test Suite
```bash
# API connectivity tests
python test_openai_key.py
python test_whisper_api.py
python test_openai_whisper.py

# Functionality tests
python test_video_complete.py
python test_video_transcriber.py
python test_video_transcription_fix.py

# Quota and rate limiting tests
python test_openai_whisper_quota.py
python test_whisper_quota_simple.py
```

### Test API Keys
```bash
# Test OpenAI API connectivity
python -c "import openai; print('OpenAI SDK installed')"

# Test Whisper API access
python test_whisper_key.py
```

## 🔧 Troubleshooting

### Common Issues

#### API Key Problems
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test API connectivity
python test_openai_key.py
python test_whisper_api.py
```

#### File Processing Issues
```bash
# Check FFmpeg installation
ffmpeg -version

# Test file format support
python -c "import ffmpeg; print('FFmpeg Python binding available')"
```

#### Large File Problems
- Enable chunking for files over 25MB
- Increase processing timeout for long videos
- Check available disk space for temporary files
- Monitor memory usage during processing

#### YouTube Download Issues
- Verify YouTube URL accessibility
- Check yt-dlp version and update if needed
- Test with different video formats
- Ensure network connectivity

#### Quota and Rate Limiting
- Monitor OpenAI API usage and billing
- Implement request queuing for high volume
- Use appropriate Whisper model for needs
- Consider batch processing for efficiency

### Performance Optimization
- Use SSD storage for faster file processing
- Increase available RAM for large file processing
- Configure concurrent processing limits
- Enable Redis caching for repeated requests

## 🏗️ Architecture Details

### Tech Stack
- **Backend**: FastAPI + uvicorn ASGI server
- **Transcription**: OpenAI Whisper API
- **Media Processing**: FFmpeg, yt-dlp, pydub
- **File Handling**: Secure temporary file management
- **Frontend**: Modern HTML/CSS/JS with drag-and-drop

### Processing Pipeline
1. **Input Validation & Preparation**
2. **Media Extraction & Conversion**
3. **Intelligent Chunking** (if needed)
4. **Parallel Whisper API Processing**
5. **Text Assembly & Quality Assurance**
6. **Export & Analytics**

### Integration Points
- **MCP Protocol**: Video-MCP service for AI agent integration
- **NXT Humans Workbench**: Full integration with launchpad
- **YouTube Integration**: Direct video URL processing
- **File System**: Secure upload and processing management

## 🔗 Related Services

- **LinkedIn Post Generator**: Transform transcripts into professional content
- **Social Research Analytics**: Analyze transcript content and sentiment
- **Journey Mappers**: Use transcripts as source material for journey mapping
- **AI Agent Assistant**: Process transcripts through conversational AI

## 📄 License

Part of the NXT Humans Intelligence Augmentation Suite. Internal use only.

## 🆘 Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review logs in `logs/` directory for detailed error information
3. Test API connectivity with provided test scripts
4. Consult the NXT Humans Workbench documentation
5. Contact the development team

### Logs and Debugging
- Application logs: `logs/app.log`
- Processing logs: `logs/transcription.log`
- Error logs: `logs/error.log`
- Verbose logging: Set `DEBUG=true` in environment

---

*This service is part of the NXT Humans Intelligence Augmentation Suite - transforming customer experience research through advanced AI technology.*