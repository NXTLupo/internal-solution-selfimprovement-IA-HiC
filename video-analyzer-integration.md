# NXT Humans AI Video Analyzer Integration

This document outlines the integration of a new AI-powered Video Analysis app into the NXT Humans CX Workbench platform.

## Overview

The AI Video Analyzer will transcribe and analyze videos from YouTube or direct uploads, providing:

1. **Accurate Transcriptions** with timestamps
2. **Concise Summaries** of video content
3. **Theme Identification** of major topics discussed
4. **Insight Generation** for market research applications
5. **Keyword Extraction** for content categorization

This tool extends the CX Workbench capabilities by adding video analysis alongside the existing Reddit data collection, social research analysis, and journey mapping tools.

## Integration Architecture

The Video Analyzer will be implemented as the fifth core component of the CX Workbench, following the established MCP (Model Context Protocol) architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Launchpad Frontend                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐  │  ┌───────────┐
│  │ Reddit Data │  │   Social    │  │  Journey    │  │  Chat  │  │  │   Video   │
│  │  Collector  │  │  Research   │  │   Mapper    │  │ Agent  │  │  │ Analyzer  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘  │  └───────────┘
└─────────────────────────────────────────────────────────────────┘        │
              │             │              │             │                  │
              │             │              │             │                  │
              ▼             ▼              ▼             ▼                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         WebSocket Proxy (Launchpad)                          │
└──────────────────────────────────────────────────────────────────────────────┘
              │             │              │             │                  │
              │             │              │             │                  │
              ▼             ▼              ▼             ▼                  ▼
┌──────────────┐   ┌────────────────┐   ┌────────────┐   ┌────────┐   ┌────────────┐
│ Reddit MCP   │   │ Social MCP     │   │ Journey MCP│   │Agent   │   │Video MCP   │
│ Service      │   │ Service        │   │ Service    │   │Service │   │Service     │
└──────────────┘   └────────────────┘   └────────────┘   └────────┘   └────────────┘
       │                  │                   │               │              │
       │                  │                   │               │              │
       │                  │                   │               │              │
       ▼                  ▼                   ▼               ▼              ▼
┌──────────────┐   ┌────────────────┐   ┌────────────┐    ┌─────────┐   ┌────────────┐
│ Reddit       │   │ Social Research│   │ Journey    │    │Anthropic│   │Video       │
│ Ripper       │   │ Tool           │   │ Mapper     │    │Claude API│   │Analyzer    │
└──────────────┘   └────────────────┘   └────────────┘    └─────────┘   └────────────┘
```

### Key Components

1. **Video Analyzer Frontend**
   - Accessible through the Launchpad interface
   - Provides YouTube URL input or video file upload
   - Displays transcripts, summaries, themes, insights, and keywords
   - Responsive design consistent with NXT Humans styling

2. **Video MCP Service**
   - Acts as middleware between frontend and analyzer backend
   - Exposes standardized API for video analysis capabilities
   - Handles WebSocket communication for progress updates
   - Integrates with Agent Orchestrator for AI-powered analysis

3. **Video Analyzer Backend**
   - Handles YouTube video ingestion and processing
   - Manages transcription pipeline using Whisper
   - Coordinates LLM-based analysis operations
   - Stores and provides access to analysis results

### Integration Points

1. **Launchpad Integration**
   - Add Video Analyzer tile to Launchpad frontend
   - Extend WebSocket proxy to route Video Analyzer traffic
   - Update navigation and menu components

2. **Docker Deployment**
   - Add new container definitions to docker-compose-agent.yml
   - Configure networking between Video MCP and other services
   - Share volumes for temporary storage of videos/transcripts

3. **Agent Integration**
   - Register Video Analyzer capabilities with Agent Orchestrator
   - Add tool definitions for video analysis operations
   - Implement prompt templates for video insights via Claude

## Technology Stack

The Video Analyzer will use technologies compatible with the existing CX Workbench:

1. **Frontend**: React.js with responsive design (consistent with other components)
2. **Backend**: Python with FastAPI (matching Journey Mapper)
3. **Transcription**: Whisper Large-v2 (OpenAI's open-source ASR model)
4. **Analysis**: Claude 3.7 Sonnet (same as Journey Mapper) or locally deployed LLMs
5. **Video Processing**: yt-dlp for YouTube ingestion

## Environment Configuration

Add the following environment variables to support the Video Analyzer:

```
VIDEO_ANALYZER_PORT=8505             # Port for the Video Analyzer service
VIDEO_MCP_PORT=8504                  # Port for the Video MCP service
VIDEO_ANALYZER_URL=http://video-analyzer:8505  # Internal URL
VIDEO_ANALYZER_CLIENT_URL=http://localhost:8505  # External URL
WHISPER_MODEL=large-v2               # Whisper model size
MAX_VIDEO_LENGTH=7200                # Maximum video length in seconds
ENABLE_DIARIZATION=false             # Enable speaker diarization (optional)
```

## Docker Configuration

Add the following services to docker-compose-agent.yml:

```yaml
# Video MCP Wrapper
video-mcp:
  image: python:3.10-slim
  ports:
    - "${VIDEO_MCP_PORT:-8504}:8504"
  environment:
    - PORT=8504
    - VIDEO_ANALYZER_URL=http://video-analyzer:8505
  volumes:
    - ./mcp-services/video-mcp:/app
    - video-uploads:/app/uploads
  working_dir: /app
  command: >
    bash -c "pip install --no-cache-dir --upgrade pip setuptools wheel &&
            pip install --no-cache-dir -r requirements.txt &&
            mkdir -p uploads &&
            python app.py"
  networks:
    - nxt-humans-network
  depends_on:
    - video-analyzer

# Video Analyzer Service
video-analyzer:
  image: python:3.10-slim
  ports:
    - "${VIDEO_ANALYZER_PORT:-8505}:8505"
  environment:
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - PORT=8505
    - ANTHROPIC_MODEL=${ANTHROPIC_MODEL:-claude-3-7-sonnet-20250219}
    - WHISPER_MODEL=${WHISPER_MODEL:-large-v2}
    - MAX_VIDEO_LENGTH=${MAX_VIDEO_LENGTH:-7200}
  volumes:
    - ./internal-solutions-video-analyzer:/app
    - video-uploads:/app/uploads
  working_dir: /app
  command: >
    bash -c "apt-get update && apt-get install -y build-essential python3-dev ffmpeg git curl make &&
            pip install --no-cache-dir --upgrade pip setuptools wheel &&
            pip install --no-cache-dir -r requirements.txt &&
            mkdir -p logs uploads transcripts &&
            python run.py"
  networks:
    - nxt-humans-network
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]

volumes:
  video-uploads:
    driver: local
```

## Folder Structure

```
/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/
├── internal-solutions-video-analyzer/     # Main Video Analyzer application
│   ├── run.py                            # Entry point script
│   ├── requirements.txt                  # Python dependencies
│   ├── src/                              # Source code
│   │   ├── app.py                        # FastAPI application
│   │   ├── transcription/                # Transcription module
│   │   │   ├── whisper_transcriber.py    # Whisper implementation
│   │   │   └── youtube_fetcher.py        # YouTube video/caption fetcher
│   │   ├── analysis/                     # Analysis module
│   │   │   ├── summarizer.py             # Text summarization
│   │   │   ├── theme_extractor.py        # Theme identification
│   │   │   ├── insight_generator.py      # Insight generation
│   │   │   └── keyword_extractor.py      # Keyword extraction
│   │   └── utils/                        # Utility functions
│   │       ├── logger.py                 # Logging
│   │       ├── prompts.py                # LLM prompts
│   │       └── file_manager.py           # File handling
│   ├── uploads/                          # Upload directory
│   ├── transcripts/                      # Stored transcripts
│   └── logs/                             # Log files
│
├── mcp-services/
│   ├── video-mcp/                        # Video MCP service
│   │   ├── app.py                        # MCP implementation
│   │   ├── requirements.txt              # Python dependencies
│   │   └── uploads/                      # Shared upload directory
│   └── agent/
│       ├── tools/                        # Agent tools
│       │   └── video_analyzer_tools.py   # Video analyzer tool definitions
│       └── prompts/
│           └── video_analyzer_prompts.py # Tool prompts
│
└── launchpad/
    ├── templates/
    │   └── video-analyzer.html           # Video analyzer page template
    └── static/
        ├── js/
        │   └── video-analyzer.js         # Frontend JavaScript
        └── css/
            └── video-analyzer.css        # Component styles
```

## API Endpoints

The Video Analyzer will expose the following RESTful API endpoints:

### Video MCP Service (port 8504)
- `POST /video.analyze` - Start video analysis with URL
- `POST /video.upload` - Upload and analyze video file
- `GET /video.status` - Check analysis status
- `GET /video.results` - Get analysis results
- `GET /video.transcript` - Download transcript

### Video Analyzer Backend (port 8505)
- `POST /api/analyze` - Process video URL
- `POST /api/upload` - Process video file
- `GET /api/status/{job_id}` - Check job status
- `GET /api/results/{job_id}` - Get analysis results
- `GET /api/transcript/{job_id}` - Get transcript
- `GET /api/health` - Service health check

## Implementation Steps

1. Create directory structure for Video Analyzer and MCP service
2. Implement backend transcription pipeline using Whisper
3. Implement analysis modules using Claude 3.7 Sonnet
4. Develop Video MCP service with standardized API
5. Create frontend components for Launchpad integration
6. Add Docker configuration to compose files
7. Add Agent tool definitions for video analysis
8. Update Launchpad WebSocket proxy for video traffic routing
9. Test end-to-end functionality
10. Create documentation

## Resource Requirements

- **CPU**: 4+ cores recommended for transcription
- **RAM**: 8GB minimum, 16GB recommended
- **GPU**: NVIDIA GPU with 8GB+ VRAM recommended for Whisper
- **Storage**: 10GB+ for temporary video files and transcripts
- **Network**: Sufficient bandwidth for YouTube video downloads

## Security Considerations

- Implement file type validation for uploads
- Set maximum file size limits
- Sanitize YouTube URLs
- Ensure temporary files are properly cleaned up
- Apply appropriate access controls

## Usage Examples

### Agent Command Examples
```
"Analyze this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
"Summarize the key points from this video"
"What are the main themes in this YouTube video?"
"Extract insights from this product review video"
"Transcribe this video and identify keywords"
```

### Direct API Usage
```python
# Python example using requests
import requests

# Start analysis
response = requests.post(
    "http://localhost:8504/video.analyze",
    json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
)
job_id = response.json()["job_id"]

# Check status
status = requests.get(
    f"http://localhost:8504/video.status?job_id={job_id}"
).json()["status"]

# Get results when complete
if status == "completed":
    results = requests.get(
        f"http://localhost:8504/video.results?job_id={job_id}"
    ).json()
    
    # Download transcript
    transcript = requests.get(
        f"http://localhost:8504/video.transcript?job_id={job_id}"
    ).text
```

## Integration Timeline

1. **Week 1**: Architecture planning and skeleton implementation
2. **Week 2**: Transcription pipeline implementation
3. **Week 3**: Analysis module implementation
4. **Week 4**: MCP service and frontend integration
5. **Week 5**: Docker integration and testing
6. **Week 6**: Documentation and deployment

## Future Enhancements

- Speaker diarization for multi-speaker videos
- Visual content analysis (scene detection, object recognition)
- Sentiment analysis by segment
- Integration with Reddit Ripper for video comment analysis
- Batch processing of multiple videos
- Support for additional video platforms beyond YouTube