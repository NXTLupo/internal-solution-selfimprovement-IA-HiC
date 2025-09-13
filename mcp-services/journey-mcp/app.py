"""
Journey Mapper MCP Service - JSON-RPC 2.0 Compliant
---------------------------------------------------
This service wraps the Journey Mapper tool in a Model Context Protocol (MCP)
compatible interface using proper JSON-RPC 2.0 format for agent integration.
Importantly, this service handles file uploads to enable processing data files.
"""

import os
import json
import uuid
import tempfile
import requests
import re
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("journey-mcp")

# Configuration
JOURNEY_MAPPER_URL = os.environ.get("JOURNEY_MAPPER_URL", "http://journey-mapper:8000")

# JSON-RPC 2.0 Models
class JSONRPCRequest(BaseModel):
    """JSON-RPC 2.0 request format"""
    jsonrpc: str = Field("2.0", description="JSON-RPC version")
    id: Union[str, int] = Field(..., description="Request ID")
    method: str = Field(..., description="Method name")
    params: Dict[str, Any] = Field({}, description="Method parameters")

class JSONRPCResponse(BaseModel):
    """JSON-RPC 2.0 response format"""
    jsonrpc: str = Field("2.0", description="JSON-RPC version")
    id: Union[str, int] = Field(..., description="Request ID")
    result: Optional[Dict[str, Any]] = Field(None, description="Method result")
    error: Optional[Dict[str, Any]] = Field(None, description="Error information")

class ToolCallParams(BaseModel):
    """Parameters for tool/call method"""
    name: str = Field(..., description="Tool name")
    arguments: Dict[str, Any] = Field({}, description="Tool arguments")

# Models
class JourneyRequest(BaseModel):
    name: str = Field(..., description="Name of the journey")
    description: Optional[str] = Field(None, description="Description of the journey")

class JourneyResponse(BaseModel):
    journey_id: str
    status: str

class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="Journey Mapper MCP Service",
    description="MCP-compatible service for the Journey Mapper",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for job status and file tracking
job_cache: Dict[str, Dict[str, Any]] = {}
file_cache: Dict[str, str] = {}  # Maps file_id to temporary file path

# Create temporary directory for uploaded files
os.makedirs("/tmp/journey-mcp", exist_ok=True)

# Main MCP JSON-RPC 2.0 endpoint
@app.post("/mcp", response_model=JSONRPCResponse)
async def handle_mcp_request(request: JSONRPCRequest):
    """Handle MCP JSON-RPC 2.0 requests"""
    try:
        logger.info(f"Received MCP request: method={request.method}, id={request.id}")
        
        if request.method == "tools/list":
            # Return list of available tools
            tools = [
                {
                    "name": "journey_upload_file",
                    "description": "Upload a file for journey mapping",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "file": {
                                "type": "file",
                                "description": "File to upload (PDF, CSV, TXT, or JSON)"
                            },
                            "file_name": {
                                "type": "string",
                                "description": "Name of the file (if not provided in file object)"
                            }
                        },
                        "required": ["file"]
                    }
                },
                {
                    "name": "journey_generate_map",
                    "description": "Generate a customer journey map from uploaded file",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "file_id": {
                                "type": "string",
                                "description": "ID of previously uploaded file"
                            },
                            "journey_name": {
                                "type": "string",
                                "description": "Name for the journey map"
                            },
                            "description": {
                                "type": "string",
                                "description": "Description of the journey context",
                                "default": ""
                            }
                        },
                        "required": ["file_id"]
                    }
                },
                {
                    "name": "journey_get_status",
                    "description": "Check the status of a journey map generation",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "journey_id": {
                                "type": "string",
                                "description": "Journey ID from a previous generation request"
                            }
                        },
                        "required": ["journey_id"]
                    }
                },
                {
                    "name": "journey_get_results",
                    "description": "Get the results of a completed journey mapping",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "journey_id": {
                                "type": "string",
                                "description": "Journey ID from a previous generation request"
                            }
                        },
                        "required": ["journey_id"]
                    }
                },
                {
                    "name": "journey_list_maps",
                    "description": "List all available journey maps",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            ]
            
            return JSONRPCResponse(
                id=request.id,
                result={"tools": tools}
            )
            
        elif request.method == "tools/call":
            # Handle tool execution
            tool_params = ToolCallParams(**request.params)
            tool_name = tool_params.name
            arguments = tool_params.arguments
            
            logger.info(f"Executing tool: {tool_name} with arguments: {arguments}")
            
            if tool_name == "journey_upload_file":
                result = await execute_journey_upload_file(arguments)
            elif tool_name == "journey_generate_map":
                result = await execute_journey_generate_map(arguments)
            elif tool_name == "journey_get_status":
                result = await execute_journey_get_status(arguments)
            elif tool_name == "journey_get_results":
                result = await execute_journey_get_results(arguments)
            elif tool_name == "journey_list_maps":
                result = await execute_journey_list_maps(arguments)
            else:
                return JSONRPCResponse(
                    id=request.id,
                    error={
                        "code": -32601,
                        "message": f"Tool '{tool_name}' not found"
                    }
                )
            
            return JSONRPCResponse(
                id=request.id,
                result=result
            )
        else:
            return JSONRPCResponse(
                id=request.id,
                error={
                    "code": -32601,
                    "message": f"Method '{request.method}' not found"
                }
            )
            
    except Exception as e:
        logger.exception(f"Error handling MCP request: {str(e)}")
        return JSONRPCResponse(
            id=request.id,
            error={
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        )

# Tool execution functions
async def execute_journey_upload_file(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute journey upload file tool"""
    try:
        # Note: File uploads in JSON-RPC format will be handled differently
        # For now, return a message directing users to use the form endpoint
        return {
            "error": "File uploads through JSON-RPC not yet supported. Please use the legacy endpoint.",
            "status": "error",
            "message": "Use the /mcp/invoke/journey_upload_file endpoint for file uploads"
        }
    except Exception as e:
        logger.exception("Error executing journey upload file")
        return {
            "error": f"Error executing journey upload file: {str(e)}",
            "status": "error"
        }

async def execute_journey_generate_map(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute journey generate map tool"""
    try:
        file_id = arguments.get("file_id")
        journey_name = arguments.get("journey_name")
        description = arguments.get("description", "")
        
        if not file_id:
            return {
                "error": "file_id is required",
                "status": "error"
            }
            
        # Generate default journey name if not provided
        if not journey_name:
            journey_name = "Customer Journey Map"
        
        # Check if file_id exists in cache
        file_path = file_cache.get(file_id)
        if not file_path or not os.path.exists(file_path):
            return {
                "error": f"File with ID {file_id} not found. Please upload the file first.",
                "status": "error"
            }
        
        with open(file_path, "rb") as f:
            file_data = f.read()
        file_name = os.path.basename(file_path).split("_", 1)[1]  # Remove file_id_ prefix
        
        # Create multipart form data for the file upload to Journey Mapper
        files = {"files": (file_name, file_data, "application/octet-stream")}
        
        data = {
            "title": journey_name,
            "description": description,
            "journey_type": "customer_journey",
            "llm_model": "claude-3-7-sonnet-20250219"
        }
        
        logger.info(f"Sending file {file_name} to Journey Mapper with data: {data}")
        
        # Send request to Journey Mapper analyze endpoint
        response = requests.post(
            urljoin(JOURNEY_MAPPER_URL, "/api/analyze"),
            files=files,
            data=data,
            timeout=1200,  # 20 minutes timeout
            allow_redirects=False
        )
        
        journey_id = None
        
        # Check response - Journey Mapper returns a redirect (303) to the generated HTML
        if response.status_code == 303:
            # Extract journey_id from the redirect URL
            redirect_url = response.headers.get("location", "")
            logger.info(f"Journey Mapper redirected to: {redirect_url}")
            
            # Extract journey ID from URL like "/journey_maps/journey_map_{id}.html"
            match = re.search(r'/journey_maps/journey_map_([^/]+)\.html', redirect_url)
            if match:
                journey_id = match.group(1)
                logger.info(f"Extracted journey_id: {journey_id}")
            else:
                return {
                    "error": f"Could not extract journey ID from redirect URL: {redirect_url}",
                    "status": "error"
                }
        elif response.status_code == 200:
            # Unexpected 200 response - try to parse as JSON
            try:
                result = response.json()
                journey_id = result.get("journey_id")
                if not journey_id:
                    return {
                        "error": "No journey ID returned from Journey Mapper",
                        "status": "error"
                    }
            except json.JSONDecodeError as e:
                return {
                    "error": f"Invalid JSON response from Journey Mapper: {str(e)}",
                    "status": "error"
                }
        else:
            return {
                "error": f"Journey Mapper processing error (HTTP {response.status_code}): {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
        if not journey_id:
            return {
                "error": "No journey ID returned from Journey Mapper",
                "status": "error"
            }
        
        # Cache journey details for future reference
        job_cache[journey_id] = {
            "file_id": file_id,
            "journey_name": journey_name,
            "description": description,
            "status": "completed"
        }
        
        return {"journey_id": journey_id, "status": "success"}
        
    except Exception as e:
        logger.exception("Error executing journey generate map")
        return {
            "error": f"Error executing journey generate map: {str(e)}",
            "status": "error"
        }

async def execute_journey_get_status(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute journey get status tool"""
    try:
        journey_id = arguments.get("journey_id")
        
        if not journey_id:
            return {
                "error": "journey_id is required",
                "status": "error"
            }
        
        # Check our local cache first since analyze endpoint processes immediately
        if journey_id in job_cache:
            cached_job = job_cache[journey_id]
            return {
                "status": cached_job.get("status", "completed"),
                "progress": 100,
                "journey_id": journey_id,
                "journey_name": cached_job.get("journey_name", ""),
                "message": "Journey map completed"
            }
        
        # If not in cache, check if the journey map file exists in the journey mapper
        try:
            # Check if journey map HTML file exists
            response = requests.get(
                urljoin(JOURNEY_MAPPER_URL, f"/api/export-pdf/{journey_id}"),
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "status": "completed",
                    "progress": 100,
                    "journey_id": journey_id,
                    "message": "Journey map completed and available"
                }
            else:
                return {
                    "status": "not_found",
                    "progress": 0,
                    "journey_id": journey_id,
                    "message": "Journey map not found"
                }
        except Exception:
            return {
                "status": "not_found",
                "progress": 0,
                "journey_id": journey_id,
                "message": "Journey map not found"
            }
        
    except Exception as e:
        logger.exception("Error executing journey get status")
        return {
            "error": f"Error executing journey get status: {str(e)}",
            "status": "error"
        }

async def execute_journey_get_results(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute journey get results tool"""
    try:
        journey_id = arguments.get("journey_id")
        
        if not journey_id:
            return {
                "error": "journey_id is required",
                "status": "error"
            }
        
        # Check our local cache first for the result
        if journey_id in job_cache:
            cached_job = job_cache[journey_id]
            cached_result = cached_job.get("result", {})
            
            # Prepare the visualization URL
            visualization_url = urljoin(
                os.environ.get("JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"),
                f"/static/journey_map_{journey_id}.html"
            )
            
            return {
                "journey_id": journey_id,
                "journey_name": cached_job.get("journey_name", ""),
                "status": "completed",
                "visualization_url": visualization_url,
                "html_url": cached_result.get("html_url", ""),
                "mermaid_code": cached_result.get("mermaid_code", ""),
                "journey_summary": cached_result.get("journey_summary", ""),
                "result": cached_result
            }
        
        # If not in cache, try to get the HTML file directly from the journey mapper
        try:
            # Check if journey map HTML file exists and get download URL
            html_url = urljoin(
                os.environ.get("JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"),
                f"/static/journey_map_{journey_id}.html"
            )
            
            # Try to access the PDF export endpoint to verify the journey exists
            pdf_response = requests.head(
                urljoin(JOURNEY_MAPPER_URL, f"/api/export-pdf/{journey_id}"),
                timeout=30
            )
            
            if pdf_response.status_code == 200:
                return {
                    "journey_id": journey_id,
                    "status": "completed",
                    "visualization_url": html_url,
                    "html_url": html_url,
                    "message": "Journey map completed. You can download the HTML file from the URL provided.",
                    "download_instructions": f"Visit {html_url} to view or download the interactive journey map."
                }
            else:
                return {
                    "error": f"Journey map with ID {journey_id} not found",
                    "status": "error"
                }
                
        except requests.RequestException:
            return {
                "error": f"Journey map with ID {journey_id} not found or service unavailable",
                "status": "error"
            }
        
    except Exception as e:
        logger.exception("Error executing journey get results")
        return {
            "error": f"Error executing journey get results: {str(e)}",
            "status": "error"
        }

async def execute_journey_list_maps(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute journey list maps tool"""
    try:
        # Return journey maps from our local cache
        processed_maps = []
        
        # Add cached journey maps
        for journey_id, job_info in job_cache.items():
            processed_maps.append({
                "id": journey_id,
                "name": job_info.get("journey_name", "Unnamed Journey"),
                "status": job_info.get("status", "completed"),
                "description": job_info.get("description", ""),
                "created_at": "Recently created"
            })
        
        return {"journey_maps": processed_maps, "status": "success"}
        
    except Exception as e:
        logger.exception("Error executing journey list maps")
        return {
            "error": f"Error executing journey list maps: {str(e)}",
            "status": "error"
        }

# Legacy endpoints (for backward compatibility)

# MCP Tools definition
@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    tools = [
        MCPToolSpec(
            name="journey_upload_file",
            description="Upload a file for journey mapping",
            parameters={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "file",
                        "description": "File to upload (PDF, CSV, TXT, or JSON)"
                    },
                    "file_name": {
                        "type": "string",
                        "description": "Name of the file (if not provided in file object)"
                    }
                },
                "required": ["file"]
            },
            returns={
                "file_id": {
                    "type": "string",
                    "description": "ID for the uploaded file, for use in other API calls"
                },
                "file_name": {
                    "type": "string",
                    "description": "Name of the uploaded file"
                },
                "file_type": {
                    "type": "string",
                    "description": "Detected file type"
                }
            }
        ),
        MCPToolSpec(
            name="journey_generate_map",
            description="Generate a customer journey map from uploaded file",
            parameters={
                "type": "object",
                "properties": {
                    "file_id": {
                        "type": "string",
                        "description": "ID of previously uploaded file"
                    },
                    "journey_name": {
                        "type": "string",
                        "description": "Name for the journey map"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the journey context",
                        "default": ""
                    }
                },
                "required": ["file_id"]
            },
            returns={
                "journey_id": {
                    "type": "string",
                    "description": "ID of the generated journey for tracking"
                }
            }
        ),
        MCPToolSpec(
            name="journey_get_status",
            description="Check the status of a journey map generation",
            parameters={
                "type": "object",
                "properties": {
                    "journey_id": {
                        "type": "string",
                        "description": "Journey ID from a previous generation request"
                    }
                },
                "required": ["journey_id"]
            },
            returns={
                "status": {
                    "type": "string",
                    "description": "Status of journey generation (pending, in_progress, completed, failed)"
                },
                "progress": {
                    "type": "number",
                    "description": "Progress percentage (0-100)"
                },
                "message": {
                    "type": "string",
                    "description": "Status message or error"
                }
            }
        ),
        MCPToolSpec(
            name="journey_get_results",
            description="Get the results of a completed journey mapping",
            parameters={
                "type": "object",
                "properties": {
                    "journey_id": {
                        "type": "string",
                        "description": "Journey ID from a previous generation request"
                    }
                },
                "required": ["journey_id"]
            },
            returns={
                "journey_map": {
                    "type": "object",
                    "description": "Journey map data structure"
                },
                "visualization_url": {
                    "type": "string",
                    "description": "URL to view the journey map visualization"
                },
                "stages": {
                    "type": "array",
                    "description": "List of journey stages",
                    "items": {
                        "type": "object"
                    }
                },
                "insights": {
                    "type": "array",
                    "description": "Insights derived from journey analysis",
                    "items": {
                        "type": "string"
                    }
                }
            }
        ),
        MCPToolSpec(
            name="journey_list_maps",
            description="List all available journey maps",
            parameters={
                "type": "object",
                "properties": {},
                "required": []
            },
            returns={
                "journey_maps": {
                    "type": "array",
                    "description": "List of available journey maps",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "created_at": {"type": "string"},
                            "status": {"type": "string"}
                        }
                    }
                }
            }
        )
    ]
    return tools

@app.post("/mcp/invoke/journey_upload_file", response_model=Dict[str, Any])
async def invoke_upload_file(
    file: UploadFile = File(...),
    file_name: Optional[str] = Form(None)
):
    """MCP endpoint to upload a file for journey mapping"""
    try:
        # Generate a file ID
        file_id = str(uuid.uuid4())
        
        # Get file name from either parameter or from the uploaded file
        actual_file_name = file_name or file.filename
        
        if not actual_file_name:
            raise HTTPException(
                status_code=400,
                detail="File name not provided"
            )
            
        # Create a temporary file to store the uploaded content
        file_path = f"/tmp/journey-mcp/{file_id}_{actual_file_name}"
        
        # Save the uploaded file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Detect file type from extension
        file_ext = os.path.splitext(actual_file_name)[1].lower()
        file_type = {
            ".pdf": "pdf",
            ".csv": "csv",
            ".txt": "text",
            ".json": "json"
        }.get(file_ext, "unknown")
        
        if file_type == "unknown":
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Supported types are PDF, CSV, TXT, and JSON."
            )
            
        # Store in cache for future reference
        file_cache[file_id] = file_path
        
        return {
            "file_id": file_id,
            "file_name": actual_file_name,
            "file_type": file_type
        }
        
    except Exception as e:
        logger.exception("Error uploading file")
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )

@app.post("/mcp/invoke/journey_generate_map", response_model=Dict[str, Any])
async def invoke_generate_map(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    journey_name: str = Form(...),
    description: str = Form("")
):
    """MCP endpoint to generate a journey map from an uploaded file"""
    try:
        file_data = None
        file_name = None
        
        # Check if file is uploaded directly (from agent)
        if file:
            file_data = await file.read()
            file_name = file.filename
            logger.info(f"Received file directly: {file_name}, size: {len(file_data)} bytes")
        
        # Otherwise, check if file_id exists in cache (from previous upload)
        elif file_id:
            file_path = file_cache.get(file_id)
            
            if not file_path or not os.path.exists(file_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"File with ID {file_id} not found. Please upload the file first."
                )
            
            with open(file_path, "rb") as f:
                file_data = f.read()
            file_name = os.path.basename(file_path).split("_", 1)[1]  # Remove file_id_ prefix
            logger.info(f"Using cached file: {file_name}, size: {len(file_data)} bytes")
        
        else:
            raise HTTPException(
                status_code=400,
                detail="Either 'file' or 'file_id' must be provided"
            )
        
        # Create multipart form data for the file upload to Journey Mapper
        files = {"files": (file_name, file_data, "application/octet-stream")}
        
        data = {
            "title": journey_name,
            "description": description,
            "journey_type": "customer_journey",
            "llm_model": "claude-3-7-sonnet-20250219"
        }
        
        logger.info(f"Sending file {file_name} to Journey Mapper with data: {data}")
        
        # Send request to Journey Mapper analyze endpoint (processes immediately)
        response = requests.post(
            urljoin(JOURNEY_MAPPER_URL, "/api/analyze"),
            files=files,
            data=data,
            timeout=1200,  # 20 minutes timeout for comprehensive journey mapping
            allow_redirects=False  # Don't follow redirects automatically
        )
            
        # Check response - Journey Mapper returns a redirect (303) to the generated HTML
        if response.status_code == 303:
            # Extract journey_id from the redirect URL
            redirect_url = response.headers.get("location", "")
            logger.info(f"Journey Mapper redirected to: {redirect_url}")
            
            # Extract journey ID from URL like "/journey_maps/journey_map_{id}.html"
            match = re.search(r'/journey_maps/journey_map_([^/]+)\.html', redirect_url)
            if match:
                journey_id = match.group(1)
                logger.info(f"Extracted journey_id: {journey_id}")
            else:
                logger.error(f"Could not extract journey_id from redirect URL: {redirect_url}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Could not extract journey ID from redirect URL: {redirect_url}"
                )
        elif response.status_code != 200:
            logger.error(f"Error processing file with Journey Mapper: Status {response.status_code}, Response: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Journey Mapper processing error (HTTP {response.status_code}): {response.text}"
            )
        else:
            # Unexpected 200 response - try to parse as JSON
            try:
                result = response.json()
                journey_id = result.get("journey_id")
                if not journey_id:
                    raise HTTPException(
                        status_code=500,
                        detail="No journey ID returned from Journey Mapper"
                    )
            except json.JSONDecodeError as e:
                logger.error(f"Could not parse Journey Mapper response as JSON: {str(e)}, Response: {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid JSON response from Journey Mapper: {str(e)}"
                )
        
        if not journey_id:
            raise HTTPException(
                status_code=500,
                detail="No journey ID returned from Journey Mapper"
            )
            
        # Cache journey details for future reference
        job_cache[journey_id] = {
            "file_id": file_id,
            "journey_name": journey_name,
            "description": description,
            "status": "completed",
            "result": result
        }
        
        # Schedule cleanup of local file after some time (only if we used cached file)
        if file_id and file_id in file_cache:
            file_path = file_cache[file_id]
            background_tasks.add_task(
                lambda path=file_path: os.unlink(path) if os.path.exists(path) else None,
                delay=3600  # Clean up after 1 hour
            )
        
        return {"journey_id": journey_id}
        
    except Exception as e:
        logger.exception("Error generating journey map")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating journey map: {str(e)}"
        )

@app.post("/mcp/invoke/journey_get_status", response_model=Dict[str, Any])
async def invoke_get_status(journey_id: str = Form(...)):
    """MCP endpoint to check journey map generation status"""
    try:
        # Check our local cache first since analyze endpoint processes immediately
        if journey_id in job_cache:
            cached_job = job_cache[journey_id]
            return {
                "status": cached_job.get("status", "completed"),
                "progress": 100,
                "journey_id": journey_id,
                "journey_name": cached_job.get("journey_name", ""),
                "message": "Journey map completed"
            }
        
        # If not in cache, check if the journey map file exists in the journey mapper
        try:
            # Check if journey map HTML file exists
            response = requests.get(
                urljoin(JOURNEY_MAPPER_URL, f"/api/export-pdf/{journey_id}"),
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    "status": "completed",
                    "progress": 100,
                    "journey_id": journey_id,
                    "message": "Journey map completed and available"
                }
            else:
                return {
                    "status": "not_found",
                    "progress": 0,
                    "journey_id": journey_id,
                    "message": "Journey map not found"
                }
        except Exception:
            return {
                "status": "not_found",
                "progress": 0,
                "journey_id": journey_id,
                "message": "Journey map not found"
            }
        
    except Exception as e:
        logger.exception("Error getting journey status")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting journey status: {str(e)}"
        )

@app.post("/mcp/invoke/journey_get_results", response_model=Dict[str, Any])
async def invoke_get_results(journey_id: str = Form(...)):
    """MCP endpoint to get journey mapping results"""
    try:
        # Check our local cache first for the result
        if journey_id in job_cache:
            cached_job = job_cache[journey_id]
            cached_result = cached_job.get("result", {})
            
            # Prepare the visualization URL
            visualization_url = urljoin(
                os.environ.get("JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"),
                f"/static/journey_map_{journey_id}.html"
            )
            
            return {
                "journey_id": journey_id,
                "journey_name": cached_job.get("journey_name", ""),
                "status": "completed",
                "visualization_url": visualization_url,
                "html_url": cached_result.get("html_url", ""),
                "mermaid_code": cached_result.get("mermaid_code", ""),
                "journey_summary": cached_result.get("journey_summary", ""),
                "result": cached_result
            }
        
        # If not in cache, try to get the HTML file directly from the journey mapper
        try:
            # Check if journey map HTML file exists and get download URL
            html_url = urljoin(
                os.environ.get("JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"),
                f"/static/journey_map_{journey_id}.html"
            )
            
            # Try to access the PDF export endpoint to verify the journey exists
            pdf_response = requests.head(
                urljoin(JOURNEY_MAPPER_URL, f"/api/export-pdf/{journey_id}"),
                timeout=30
            )
            
            if pdf_response.status_code == 200:
                return {
                    "journey_id": journey_id,
                    "status": "completed",
                    "visualization_url": html_url,
                    "html_url": html_url,
                    "message": "Journey map completed. You can download the HTML file from the URL provided.",
                    "download_instructions": f"Visit {html_url} to view or download the interactive journey map."
                }
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Journey map with ID {journey_id} not found"
                )
                
        except requests.RequestException:
            raise HTTPException(
                status_code=404,
                detail=f"Journey map with ID {journey_id} not found or service unavailable"
            )
        
    except Exception as e:
        logger.exception("Error getting journey results")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting journey results: {str(e)}"
        )

@app.post("/mcp/invoke/journey_list_maps", response_model=Dict[str, Any])
async def invoke_list_maps():
    """MCP endpoint to list all available journey maps"""
    try:
        # Return journey maps from our local cache and try to discover existing ones
        processed_maps = []
        
        # Add cached journey maps
        for journey_id, job_info in job_cache.items():
            processed_maps.append({
                "id": journey_id,
                "name": job_info.get("journey_name", "Unnamed Journey"),
                "status": job_info.get("status", "completed"),
                "description": job_info.get("description", ""),
                "created_at": "Recently created"
            })
        
        # Try to discover existing journey maps by checking the journey mapper's static files
        # This is a best-effort approach since the journey mapper doesn't have a list endpoint
        try:
            # We can't easily list all journey maps without a proper API endpoint
            # The journey mapper saves files as journey_map_{id}.html in the journey_maps directory
            # but we don't have direct access to list the directory contents
            pass
        except Exception:
            pass
            
        return {"journey_maps": processed_maps}
        
    except Exception as e:
        logger.exception("Error listing journey maps")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing journey maps: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "journey-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Journey Mapper MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp": "JSON-RPC 2.0 endpoint for tool discovery and execution",
            "mcp/tools": "Get available tools (legacy)",
            "mcp/invoke/journey_upload_file": "Upload a file (legacy)",
            "mcp/invoke/journey_generate_map": "Generate a journey map (legacy)",
            "mcp/invoke/journey_get_status": "Check journey generation status (legacy)",
            "mcp/invoke/journey_get_results": "Get journey results (legacy)",
            "mcp/invoke/journey_list_maps": "List all journey maps (legacy)"
        }
    }

# Cleanup function for temporary files
def cleanup_temp_files():
    """Clean up temporary files older than a day"""
    temp_dir = "/tmp/journey-mcp"
    current_time = time.time()
    one_day_seconds = 86400
    
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            file_age = current_time - os.path.getmtime(file_path)
            if file_age > one_day_seconds:
                try:
                    os.unlink(file_path)
                    logger.info(f"Removed old temporary file: {file_path}")
                except Exception as e:
                    logger.error(f"Error removing {file_path}: {e}")

if __name__ == "__main__":
    import uvicorn
    import time
    import threading
    
    # Start a background thread for cleanup
    cleanup_thread = threading.Thread(target=cleanup_temp_files, daemon=True)
    cleanup_thread.start()
    
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)