# OpenAI Journey Mapper (o3 Reasoning)

## Overview

The OpenAI Journey Mapper is an advanced customer journey mapping tool that leverages OpenAI's powerful reasoning models (o3, o1, o1-mini, o1-preview, o1-pro) to create comprehensive customer experience analyses. This service provides reasoning-enhanced journey mapping with configurable effort levels for optimal AI-powered insights.

## Features

### 🧠 **Advanced AI Reasoning**
- **OpenAI o3 Model Support**: Cutting-edge reasoning capabilities with configurable effort levels
- **o1-Series Compatibility**: Full support for o1, o1-mini, o1-preview, and o1-pro models
- **Configurable Reasoning Effort**: Low, medium, and high effort levels for different use cases
- **Enhanced Token Handling**: Robust completion token processing for all model types

### 📊 **Journey Mapping Capabilities**
- **Multi-Format Support**: PDF, CSV, TXT, JSON file analysis
- **Reasoning-Enhanced Analysis**: Deep customer insight extraction using advanced reasoning
- **Interactive Visualizations**: HTML-based journey map output with responsive design
- **Evidence-Based Mapping**: Direct quote extraction and citation support

### 🚀 **Technical Features**
- **FastAPI Backend**: High-performance async API with automatic documentation
- **Real-time Processing**: WebSocket-like status updates during analysis
- **Export Options**: PDF and PNG export capabilities
- **MCP Integration**: Model Context Protocol support for AI agent communication

## Technical Architecture

### Backend Stack
- **Framework**: FastAPI with uvicorn ASGI server
- **AI Integration**: OpenAI API with specialized wrapper for o3/o1 models
- **File Processing**: Multi-format document parsing and analysis
- **API Documentation**: Automatic OpenAPI/Swagger documentation

### OpenAI Models Supported
- **o3**: Latest reasoning model with configurable effort levels
- **o1**: Advanced reasoning model
- **o1-mini**: Efficient reasoning model
- **o1-preview**: Preview version of o1
- **o1-pro**: Professional version of o1

### Key Components
- `app.py`: Main FastAPI application with journey mapping endpoints
- `openai_api_wrapper.py`: Specialized wrapper handling different OpenAI model response formats
- `run.py`: Standalone server entry point

## Installation & Setup

### Prerequisites
- Python 3.8+
- OpenAI API key with access to reasoning models
- Required Python packages (see requirements.txt)

### Environment Setup
```bash
# Clone and navigate to directory
cd internal-solutions-openai-journey-mapper

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your_api_key_here
export OPENAI_MODEL=o3  # or o1, o1-mini, o1-preview, o1-pro
export REASONING_EFFORT=medium  # low, medium, high (for o3 model)
```

### Running the Service

#### Standalone Mode
```bash
python run.py
```
The service will start on `http://localhost:8090`

#### Docker Mode
```bash
docker build -t openai-journey-mapper .
docker run -p 8090:8090 -e OPENAI_API_KEY=your_key openai-journey-mapper
```

#### Via Main Workbench
```bash
# From main workbench directory
docker-compose -f docker-compose-all.yml up -d openai-journey-mapper
```

## API Usage

### Upload and Analyze
```bash
curl -X POST "http://localhost:8090/api/upload" \
  -F "file=@customer_data.pdf" \
  -F "model=o3" \
  -F "reasoning_effort=medium"
```

### Check Analysis Status
```bash
curl "http://localhost:8090/api/status/{job_id}"
```

### Download Results
```bash
curl "http://localhost:8090/api/download/{job_id}" -o journey_map.html
```

### Configuration Options
- **Model Selection**: Choose between o3, o1, o1-mini, o1-preview, o1-pro
- **Reasoning Effort**: For o3 model, set effort level (low/medium/high)
- **Output Format**: HTML visualization with optional PDF/PNG export

## API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/upload` | POST | Upload file and start journey mapping |
| `/api/status/{job_id}` | GET | Check processing status |
| `/api/download/{job_id}` | GET | Download completed journey map |
| `/api/models` | GET | List available OpenAI models |
| `/health` | GET | Service health check |

## Integration with NXT Humans Workbench

### MCP Service Integration
The service integrates with the AI agent through MCP (Model Context Protocol):
- **MCP Port**: 8505
- **Agent Tools**: `openai_journey.upload_file`, `openai_journey.generate_map`, `openai_journey.get_results`
- **Reasoning Configuration**: `openai_journey.set_reasoning_effort`

### Workbench Access
- **Direct Access**: http://localhost:8090
- **Through Launchpad**: http://localhost:8000 (integrated in main dashboard)
- **HTTPS Access**: https://localhost:8445 (when HTTPS proxy is enabled)

## Advanced Configuration

### Reasoning Effort Levels
For OpenAI o3 model:
- **Low**: Faster processing, basic reasoning
- **Medium**: Balanced performance and insight quality  
- **High**: Deep analysis, maximum reasoning capability

### Model Selection Guidelines
- **o3**: Best for complex reasoning tasks requiring deep analysis
- **o1**: Excellent general-purpose reasoning
- **o1-mini**: Efficient for simpler journey mapping tasks
- **o1-pro**: Professional-grade analysis with enhanced capabilities

## Development

### Testing
```bash
# Test API connectivity
python test_openai_api.py

# Verify o3 model access
python -c "import openai; print('OpenAI SDK ready')"
```

### Debugging
- Check OpenAI API key permissions for reasoning models
- Verify organization access to o3 models
- Monitor completion token handling in API wrapper

## Troubleshooting

### Common Issues

1. **"ResponseUsage object has no attribute 'completion_tokens'"**
   - **Solution**: The `openai_api_wrapper.py` handles this automatically
   - **Cause**: Different OpenAI models return usage data in different formats

2. **Organization Access to o3**
   - **Solution**: Ensure your OpenAI organization has access to reasoning models
   - **Check**: Run `python test_openai_api.py` to verify access

3. **Reasoning Effort Not Applied**
   - **Solution**: Only works with o3 model, ignored for other models
   - **Note**: Medium effort is used as default for o3

### Error Handling
The service includes robust error handling for:
- Invalid OpenAI API keys
- Model access restrictions
- File processing errors
- Network connectivity issues

## Performance Considerations

- **o3 Model**: Slower but provides highest quality reasoning
- **o1-mini**: Fastest processing with good results for simpler data
- **File Size**: Larger files (>50MB) may require chunking
- **Reasoning Effort**: Higher effort levels increase processing time but improve analysis quality

## Security

- API keys stored as environment variables
- No API key logging or exposure
- Secure file upload handling
- Temporary file cleanup

## Contributing

When contributing to this service:
1. Maintain compatibility with all supported OpenAI models
2. Test reasoning effort configuration thoroughly
3. Ensure proper error handling for API response variations
4. Update API wrapper if OpenAI changes response formats

## License

Part of the NXT Humans AI CX Workbench Intelligence Augmentation Suite.