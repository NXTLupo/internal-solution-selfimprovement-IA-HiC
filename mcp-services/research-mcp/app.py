"""
MCP Wrapper for HiC Research Service
Provides JSON-RPC 2.0 interface for the Humans-in-Control Research System
"""

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import requests
import json
import os
import base64
import logging
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Service URL (internal Docker network)
# HiC Research is a frontend app served on port 5011
RESEARCH_GENERATOR_URL = os.getenv("RESEARCH_GENERATOR_URL", "http://research-generator:5011")
PORT = int(os.getenv("PORT", "8507"))

# Tool definitions following MCP spec
RESEARCH_TOOLS = [
    {
        "name": "analyze_research_data",
        "description": "Analyze research data using Humans-in-Control multi-stage pipeline with human checkpoints. Generates personas, themes, and strategy decks with full transparency.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "file_content": {
                    "type": "string",
                    "description": "Base64 encoded research data file content (PDF, CSV, TXT, or other text formats)"
                },
                "file_name": {
                    "type": "string",
                    "description": "Original file name with extension (e.g., 'research_data.pdf')"
                },
                "research_goal": {
                    "type": "string",
                    "description": "The primary research objective or question to answer",
                    "default": "Understand customer experience and pain points"
                },
                "analysis_approach": {
                    "type": "string",
                    "description": "Specific methodology or framework to apply",
                    "default": "Standard ethnographic analysis"
                }
            },
            "required": ["file_content", "file_name"]
        }
    },
    {
        "name": "generate_personas_from_research",
        "description": "Generate detailed personas with evidence from research data",
        "inputSchema": {
            "type": "object",
            "properties": {
                "research_text": {
                    "type": "string",
                    "description": "Raw research text or interview transcripts"
                },
                "persona_count": {
                    "type": "integer",
                    "description": "Number of personas to generate (1-5)",
                    "minimum": 1,
                    "maximum": 5,
                    "default": 3
                },
                "include_evidence": {
                    "type": "boolean",
                    "description": "Include supporting evidence quotes for each persona trait",
                    "default": True
                }
            },
            "required": ["research_text"]
        }
    },
    {
        "name": "create_video_script",
        "description": "Create a video script from research insights",
        "inputSchema": {
            "type": "object",
            "properties": {
                "research_insights": {
                    "type": "string",
                    "description": "Key research insights and findings"
                },
                "video_duration": {
                    "type": "integer",
                    "description": "Target video duration in seconds (30-300)",
                    "minimum": 30,
                    "maximum": 300,
                    "default": 120
                },
                "video_style": {
                    "type": "string",
                    "enum": ["DOCUMENTARY", "EXPLAINER", "CASE_STUDY", "TESTIMONIAL"],
                    "description": "Style of video script to generate",
                    "default": "EXPLAINER"
                }
            },
            "required": ["research_insights"]
        }
    }
]

# JSON-RPC models
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[Dict[str, Any]] = {}

class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if Research Generator service is accessible
        response = requests.get(f"{RESEARCH_GENERATOR_URL}/health", timeout=5)
        research_generator_healthy = response.status_code == 200
    except:
        research_generator_healthy = False
    
    return {
        "status": "healthy" if research_generator_healthy else "degraded",
        "service": "research-mcp",
        "research_generator_status": "connected" if research_generator_healthy else "disconnected"
    }

@app.post("/mcp", response_model=JSONRPCResponse)
async def handle_mcp_request(request: JSONRPCRequest):
    """Handle MCP JSON-RPC 2.0 requests"""
    
    logger.info(f"Received MCP request: method={request.method}")
    
    if request.method == "tools/list":
        # Return available tools
        return JSONRPCResponse(
            jsonrpc="2.0",
            id=request.id,
            result={"tools": RESEARCH_TOOLS}
        )
    
    elif request.method == "tools/call":
        # Execute tool
        tool_name = request.params.get("name")
        arguments = request.params.get("arguments", {})
        
        logger.info(f"Executing tool: {tool_name}")
        
        try:
            if tool_name == "analyze_research_data":
                result = await analyze_research_data(
                    file_content=arguments.get("file_content", ""),
                    file_name=arguments.get("file_name", "research.txt"),
                    analysis_type=arguments.get("analysis_type", "GENERAL_ETHNOGRAPHY"),
                    output_format=arguments.get("output_format", "FULL_ANALYSIS")
                )
            elif tool_name == "generate_personas_from_research":
                result = await generate_personas_from_research(
                    research_text=arguments.get("research_text", ""),
                    persona_count=arguments.get("persona_count", 3),
                    include_evidence=arguments.get("include_evidence", True)
                )
            elif tool_name == "create_video_script":
                result = await create_video_script(
                    research_insights=arguments.get("research_insights", ""),
                    video_duration=arguments.get("video_duration", 120),
                    video_style=arguments.get("video_style", "EXPLAINER")
                )
            else:
                return JSONRPCResponse(
                    jsonrpc="2.0",
                    id=request.id,
                    error={
                        "code": -32601,
                        "message": f"Unknown tool: {tool_name}"
                    }
                )
            
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=request.id,
                result={"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}
            )
            
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=request.id,
                error={
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            )
    
    else:
        # Method not found
        return JSONRPCResponse(
            jsonrpc="2.0",
            id=request.id,
            error={
                "code": -32601,
                "message": f"Method not found: {request.method}"
            }
        )

# Tool implementations
async def analyze_research_data(file_content: str, file_name: str, analysis_type: str, output_format: str) -> Dict:
    """Analyze research data file using Research Generator service"""
    try:
        # Decode base64 content
        decoded_content = base64.b64decode(file_content)
        
        # Send to Research Generator service
        files = {"file": (file_name, decoded_content)}
        data = {
            "analysisType": analysis_type,
            "outputFormat": output_format
        }
        
        response = requests.post(
            f"{RESEARCH_GENERATOR_URL}/api/analyze",
            files=files,
            data=data,
            timeout=120  # Allow 2 minutes for analysis
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return {
                "error": f"Research generator returned status {response.status_code}",
                "message": response.text
            }
    except Exception as e:
        logger.error(f"Error in analyze_research_data: {str(e)}")
        return {"error": str(e)}

async def generate_personas_from_research(research_text: str, persona_count: int, include_evidence: bool) -> Dict:
    """Generate personas from research text"""
    try:
        # Create a temporary file from the research text
        file_content = research_text.encode('utf-8')
        file_content_b64 = base64.b64encode(file_content).decode('utf-8')
        
        # Use the analyze_research_data function with specific parameters
        return await analyze_research_data(
            file_content=file_content_b64,
            file_name="research_text.txt",
            analysis_type="GENERAL_ETHNOGRAPHY",
            output_format="PERSONAS"
        )
    except Exception as e:
        logger.error(f"Error in generate_personas_from_research: {str(e)}")
        return {"error": str(e)}

async def create_video_script(research_insights: str, video_duration: int, video_style: str) -> Dict:
    """Create video script from research insights"""
    try:
        # Create a temporary file from the insights
        file_content = f"Video Duration: {video_duration} seconds\nStyle: {video_style}\n\nInsights:\n{research_insights}".encode('utf-8')
        file_content_b64 = base64.b64encode(file_content).decode('utf-8')
        
        # Use the analyze_research_data function with specific parameters
        return await analyze_research_data(
            file_content=file_content_b64,
            file_name="video_brief.txt",
            analysis_type="BEHAVIORAL_PSYCHOLOGY",
            output_format="VIDEO_SCRIPT"
        )
    except Exception as e:
        logger.error(f"Error in create_video_script: {str(e)}")
        return {"error": str(e)}

# Legacy endpoints for compatibility
@app.get("/mcp/tools")
async def get_tools():
    """Legacy endpoint: Get available tools"""
    return RESEARCH_TOOLS

@app.post("/mcp/invoke/{tool_name}")
async def invoke_tool_legacy(tool_name: str, request: Request):
    """Legacy endpoint: Invoke a tool"""
    params = await request.json() if request.headers.get("content-type") == "application/json" else dict(await request.form())
    
    mcp_request = JSONRPCRequest(
        method="tools/call",
        params={"name": tool_name, "arguments": params}
    )
    
    response = await handle_mcp_request(mcp_request)
    
    if response.error:
        raise HTTPException(status_code=400, detail=response.error["message"])
    
    return response.result

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Research MCP wrapper on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)