# AI Presentation Generator

## Overview

The AI Presentation Generator is a sophisticated tool that transforms journey maps, PDFs, and business documents into professional PowerPoint presentations using advanced AI analysis. The service leverages Claude 4 Sonnet for intelligent content analysis and generates polished presentations with NXT Humans branding and professional layouts.

## Features

### 🎯 **Intelligent Content Analysis**
- **Claude 4 Sonnet Integration**: Advanced AI analysis for strategic business content
- **Multi-Format Support**: PDF, TXT, JSON, and Markdown file processing
- **Content Extraction**: Intelligent text extraction from various document formats
- **Business Context Understanding**: AI-powered analysis of financial data, market positioning, and strategic metrics

### 📊 **Professional Presentation Generation**
- **NXT Humans Templates**: Branded PowerPoint templates with professional styling
- **Smart Layout Selection**: Intelligent selection of slide layouts based on content type
- **Dynamic Content Insertion**: Automatic placement of titles, bullet points, and visual descriptions
- **Master Layout Integration**: Consistent branding with NXT Humans footer and page numbering

### 🎨 **Visual Enhancement**
- **Visual Description Generation**: AI-generated descriptions for charts and infographics
- **Professional Formatting**: Consistent typography, colors, and spacing
- **Template Compatibility**: Works with custom NXT Humans PowerPoint templates
- **Export Capabilities**: Direct PPTX file generation for immediate use

### 🚀 **Technical Excellence**
- **FastAPI Backend**: High-performance async API with real-time progress tracking
- **Job Status Management**: WebSocket-like progress updates during generation
- **Error Handling**: Robust error recovery and detailed status reporting
- **File Management**: Organized file storage with unique job IDs

## Technical Architecture

### Backend Stack
- **Framework**: FastAPI with uvicorn ASGI server
- **AI Integration**: Anthropic Claude 4 Sonnet (`claude-sonnet-4-20250514`)
- **Document Processing**: PyPDF2, Markdown, JSON parsing
- **PowerPoint Generation**: python-pptx library with advanced template handling
- **File Processing**: Multi-format document analysis and content extraction

### AI Processing Pipeline
1. **Content Extraction**: Multi-format file parsing and text extraction
2. **Claude 4 Analysis**: Intelligent business content analysis with structured output
3. **Content Structuring**: JSON-based slide organization with bullet points and visual descriptions
4. **PowerPoint Generation**: Template-based presentation creation with dynamic content insertion
5. **Quality Assurance**: Validation and error checking throughout the pipeline

### Key Components
- `app.py`: Main FastAPI application with presentation generation endpoints
- `templates/`: Professional PowerPoint templates with NXT Humans branding
- Content extraction pipeline supporting PDF, TXT, JSON, and Markdown formats
- Claude 4 integration with structured prompt engineering for business analysis

## Installation & Setup

### Prerequisites
- Python 3.11+
- Anthropic API key with Claude 4 access
- PowerPoint template files
- Required Python packages (see requirements.txt)

### Environment Setup
```bash
# Navigate to directory
cd internal-solutions-presentation-generator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_api_key_here
```

### Required Directories
```bash
# Create necessary directories
mkdir -p uploads generated_content static templates
```

### PowerPoint Templates
Place your branded PowerPoint templates in the `templates/` directory:
- `NXT_HUMANS_WORKING_TEMPLATE.pptx`: Main presentation template
- Templates should include placeholder layouts for dynamic content insertion

## Running the Service

### Standalone Mode
```bash
python -m uvicorn app:app --host 0.0.0.0 --port 5007 --reload
```
The service will start on `http://localhost:5007`

### Docker Mode
```bash
docker build -t presentation-generator .
docker run -p 5007:5007 -e ANTHROPIC_API_KEY=your_key presentation-generator
```

### Via Main Workbench
```bash
# From main workbench directory
docker-compose -f docker-compose-all.yml up -d presentation-generator
```

## API Usage

### File Upload and Generation
```bash
# Upload file and start presentation generation
curl -X POST "http://localhost:5007/api/upload" \
  -F "files=@business_report.pdf" \
  -H "Accept: application/json"
```

### Check Generation Status
```bash
curl "http://localhost:5007/api/status/{job_id}"
```

### Download Generated Presentation
```bash
curl "http://localhost:5007/api/download/{job_id}" -o presentation.pptx
```

### Generation Request
```bash
curl -X POST "http://localhost:5007/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "file_ids": ["uploaded_file_id"],
    "options": {
      "template": "professional",
      "include_visuals": true
    }
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/upload` | POST | Upload files for analysis |
| `/api/generate` | POST | Start presentation generation |
| `/api/status/{job_id}` | GET | Check generation progress |
| `/api/download/{job_id}` | GET | Download completed presentation |
| `/health` | GET | Service health check |
| `/` | GET | Web interface for file upload |

## Web Interface

### Features
- **Drag-and-Drop Upload**: User-friendly file upload interface
- **Real-time Progress**: Live status updates during generation
- **Preview and Download**: Immediate access to generated presentations
- **Professional UI**: Branded interface matching NXT Humans design system

### Supported File Types
- **PDF**: Business reports, research documents, financial statements
- **TXT**: Plain text business documents and notes
- **JSON**: Structured data from journey mappers and other tools
- **Markdown**: Formatted business documentation

## Claude 4 Integration

### Analysis Capabilities
- **Business Intelligence**: Financial metrics, market positioning, strategic analysis
- **Content Structuring**: Intelligent organization into slide-appropriate sections
- **Visual Recommendations**: Suggestions for charts, graphs, and infographics
- **Executive Summary Generation**: High-level insights and key takeaways

### Prompt Engineering
The service uses sophisticated prompt engineering for:
- **Market Research Expertise**: Analyzing business data from a strategic perspective
- **Executive Storytelling**: Creating compelling narratives for C-suite presentations
- **Structured Output**: JSON-formatted responses with consistent slide organization
- **Visual Strategy**: Recommendations for visual elements and data representation

### Output Structure
```json
{
  "title": "Executive Presentation Title",
  "slides": [
    {
      "title": "Slide Title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "visual_description": "Description of recommended chart/infographic"
    }
  ]
}
```

## PowerPoint Template Integration

### Template Features
- **NXT Humans Branding**: Consistent corporate identity and styling
- **Dynamic Placeholders**: Intelligent content insertion into appropriate areas
- **Professional Layouts**: Multiple slide layouts for different content types
- **Footer Integration**: Automatic addition of branded footers and page numbering

### Layout Selection
- **Title Slides**: Professional title layouts with subtitle support
- **Content Slides**: Bullet point layouts with visual description areas
- **Master Layout Compatibility**: Consistent styling across all slides
- **Template Fallbacks**: Graceful handling of missing or corrupted templates

## Integration with NXT Humans Workbench

### Workbench Access
- **Direct Access**: http://localhost:5007
- **Through Launchpad**: Integrated in main workbench dashboard
- **HTTPS Access**: https://localhost:8450 (when HTTPS proxy is enabled)

### File Integration
- **Journey Map Integration**: Direct processing of journey mapper outputs
- **Cross-Service Compatibility**: Works with outputs from other workbench tools
- **Unified File Management**: Consistent file handling across the platform

## Development

### Testing
```bash
# Test Claude 4 content generation
python debug_claude_content.py

# Test PowerPoint content insertion
python debug_content_insertion.py

# Test full pipeline
python test_presentation_content.py
```

### Debugging Tools
- **Content Verification**: Scripts to verify that content is properly inserted
- **Template Analysis**: Tools to examine PowerPoint template structure
- **Claude Response Testing**: Validation of AI-generated content structure

## Performance Optimization

### Processing Efficiency
- **Async Processing**: Non-blocking file upload and generation
- **Job Queue Management**: Efficient handling of multiple concurrent requests
- **Memory Management**: Optimized for large document processing
- **Template Caching**: Reduced load times for frequently used templates

### Content Quality
- **Claude 4 Intelligence**: Leverages the most advanced Claude model for analysis
- **Business Context Awareness**: Specialized in financial and strategic content
- **Professional Output**: Consistently high-quality presentation generation
- **Error Recovery**: Robust handling of analysis and generation errors

## Troubleshooting

### Common Issues

1. **Template Not Found**
   - **Solution**: Ensure `NXT_HUMANS_WORKING_TEMPLATE.pptx` exists in `templates/` directory
   - **Fallback**: Service creates blank presentation if template is missing

2. **Claude 4 API Errors**
   - **Solution**: Verify ANTHROPIC_API_KEY is set and valid
   - **Check**: Ensure API key has access to Claude 4 Sonnet model

3. **Empty Presentations**
   - **Solution**: Issue has been resolved with simplified Claude 4 integration
   - **Verification**: Use `test_presentation_content.py` to verify content insertion

4. **JSON Parsing Errors**
   - **Solution**: Service includes robust JSON extraction from Claude responses
   - **Fallback**: Multiple parsing strategies handle malformed JSON

### Error Handling
- **Graceful Degradation**: Service continues with reduced functionality if components fail
- **Detailed Status Updates**: Clear error messages and progress tracking
- **Recovery Mechanisms**: Automatic retry for transient failures
- **User Feedback**: Clear communication of issues and solutions

## Security

- **API Key Protection**: Secure environment variable handling
- **File Upload Security**: Validation and sanitization of uploaded files
- **Temporary File Management**: Automatic cleanup of processing files
- **No Data Persistence**: Files are processed and cleaned up automatically

## Contributing

When contributing to this service:
1. Maintain compatibility with Claude 4 API changes
2. Test with various business document types
3. Ensure PowerPoint template compatibility
4. Validate content insertion mechanisms
5. Update error handling for new edge cases

## Recent Updates

### v2.0 - Simplified Claude 4 Integration
- **FLUX Complexity Removed**: Eliminated complex image generation that was causing failures
- **Direct Content Processing**: Streamlined pipeline using Claude 4 content directly
- **Improved Reliability**: Fixed blank presentation issues with enhanced content insertion
- **Error Resolution**: Eliminated undefined function errors and variable name issues

## License

Part of the NXT Humans AI CX Workbench Intelligence Augmentation Suite.