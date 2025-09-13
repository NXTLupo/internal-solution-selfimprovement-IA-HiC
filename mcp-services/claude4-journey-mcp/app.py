"""
Claude 4 Journey Mapper MCP Service - JSON-RPC 2.0 Compliant
------------------------------------------------------------
This service wraps the Claude 4 Journey Mapper tool in a Model Context Protocol (MCP)
compatible interface using proper JSON-RPC 2.0 format for agent integration.
Importantly, this service handles file uploads to enable processing data files.
"""

import os
import json
import uuid
import tempfile
import requests
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging
import shutil
import time
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("claude4-journey-mcp")

# Configuration
JOURNEY_MAPPER_URL = os.environ.get("JOURNEY_MAPPER_URL", "http://claude4-journey-mapper:8000")

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
    title="Claude 4 Journey Mapper MCP Service",
    description="MCP-compatible service for the Claude 4 Journey Mapper",
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
                    "name": "claude4_journey_upload_file",
                    "description": "Upload a file for journey mapping with Claude 4",
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
                    "name": "claude4_journey_generate_map",
                    "description": "Generate a customer journey map from uploaded file using Claude 4",
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
                    "name": "claude4_journey_get_status",
                    "description": "Check the status of a Claude 4 journey map generation",
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
                    "name": "claude4_journey_get_results",
                    "description": "Get the results of a completed Claude 4 journey mapping",
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
                    "name": "claude4_journey_list_maps",
                    "description": "List all available Claude 4 journey maps",
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
            
            if tool_name == "claude4_journey_upload_file":
                result = await execute_claude4_journey_upload_file(arguments)
            elif tool_name == "claude4_journey_generate_map":
                result = await execute_claude4_journey_generate_map(arguments)
            elif tool_name == "claude4_journey_get_status":
                result = await execute_claude4_journey_get_status(arguments)
            elif tool_name == "claude4_journey_get_results":
                result = await execute_claude4_journey_get_results(arguments)
            elif tool_name == "claude4_journey_list_maps":
                result = await execute_claude4_journey_list_maps(arguments)
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
async def execute_claude4_journey_upload_file(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Claude 4 journey upload file tool"""
    try:
        # Note: File uploads in JSON-RPC format will be handled differently
        # For now, return a message directing users to use the form endpoint
        return {
            "error": "File uploads through JSON-RPC not yet supported. Please use the legacy endpoint.",
            "status": "error",
            "message": "Use the /mcp/invoke/claude4_journey_upload_file endpoint for file uploads"
        }
    except Exception as e:
        logger.exception("Error executing Claude 4 journey upload file")
        return {
            "error": f"Error executing Claude 4 journey upload file: {str(e)}",
            "status": "error"
        }

async def execute_claude4_journey_generate_map(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Claude 4 journey generate map tool"""
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
        
        # Check if file exists in cache
        file_path = file_cache.get(file_id)
        if not file_path or not os.path.exists(file_path):
            return {
                "error": f"File with ID {file_id} not found. Please upload the file first.",
                "status": "error"
            }
        
        with open(file_path, "rb") as f:
            file_data = f.read()
        file_name = os.path.basename(file_path).split("_", 1)[1]  # Remove file_id_ prefix
        
        # Create multipart form data for the file upload to Claude 4 Journey Mapper
        files = {"files": (file_name, file_data, "application/octet-stream")}
        
        data = {
            "title": journey_name,
            "description": description
        }
        
        # Generate journey ID immediately for tracking
        journey_id = str(uuid.uuid4())
        
        # Cache journey details as "processing" initially
        job_cache[journey_id] = {
            "file_id": file_id,
            "journey_name": journey_name,
            "description": description,
            "status": "processing",
            "start_time": time.time(),
            "result": None
        }
        
        logger.info(f"Started Claude 4 journey generation with ID {journey_id}")
        logger.info(f"Will send file {file_name} to Claude 4 Journey Mapper with data: {data}")
        
        # Start background processing in a separate thread
        def process_journey():
            try:
                logger.info(f"Background processing started for journey {journey_id}")
                response = requests.post(
                    urljoin(JOURNEY_MAPPER_URL, "/api/analyze"),
                    files={"files": (file_name, file_data, "application/octet-stream")},
                    data=data,
                    timeout=1800  # 30 minutes timeout for Claude 4 processing
                )
                
                if response.status_code != 200:
                    # Mark as failed in cache
                    job_cache[journey_id]["status"] = "failed"
                    job_cache[journey_id]["error"] = f"HTTP {response.status_code}: {response.text}"
                    logger.error(f"Journey {journey_id} failed: HTTP {response.status_code}")
                    return
                
                try:
                    # Claude 4 service returns HTML directly, not JSON with journey ID
                    if response.headers.get('content-type', '').startswith('text/html'):
                        # Store the HTML content as the result
                        html_content = response.text
                        result = {
                            "journey_map_html": html_content,
                            "message": "Journey map generated successfully",
                            "content_type": "text/html"
                        }
                        actual_journey_id = journey_id  # Use our original ID since service doesn't return one
                        logger.info(f"Claude 4 service returned HTML content ({len(html_content)} chars)")
                    else:
                        # Fallback for JSON response
                        result = response.json()
                        actual_journey_id = result.get("journey_id") or result.get("id") or journey_id
                        logger.info(f"Claude 4 service returned JSON with journey ID: {actual_journey_id}")
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    result = {"message": "Journey map generated successfully", "error": f"Parse error: {str(e)}"}
                    actual_journey_id = journey_id
                    logger.warning(f"Could not parse response: {str(e)}, using original ID: {journey_id}")
                
                # Update cache with completed status and results
                job_cache[journey_id].update({
                    "status": "completed",
                    "completion_time": time.time(),
                    "result": result,
                    "actual_journey_id": actual_journey_id
                })
                
                logger.info(f"Claude 4 journey generation completed for ID {journey_id}")
                
            except requests.exceptions.Timeout:
                job_cache[journey_id]["status"] = "failed"
                job_cache[journey_id]["error"] = "Processing timeout (over 30 minutes)"
                logger.error(f"Journey {journey_id} timed out")
            except Exception as e:
                job_cache[journey_id]["status"] = "failed"
                job_cache[journey_id]["error"] = str(e)
                logger.exception(f"Journey {journey_id} failed with exception: {str(e)}")
        
        # Start the background thread
        import threading
        thread = threading.Thread(target=process_journey)
        thread.daemon = True
        thread.start()
        
        # Return immediately with processing status
        return {
            "journey_id": journey_id, 
            "status": "processing",
            "message": "Journey map generation started. This will take 15-20 minutes. Use journey_get_status to check progress.",
            "estimated_completion": "15-20 minutes"
        }
        
    except Exception as e:
        logger.exception("Error executing Claude 4 journey generate map")
        return {
            "error": f"Error executing Claude 4 journey generate map: {str(e)}",
            "status": "error"
        }

async def execute_claude4_journey_get_status(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Claude 4 journey get status tool"""
    try:
        journey_id = arguments.get("journey_id")
        
        if not journey_id:
            return {
                "error": "journey_id is required",
                "status": "error"
            }
        
        # Check our local cache first
        if journey_id in job_cache:
            cached_job = job_cache[journey_id]
            status = cached_job.get("status", "unknown")
            start_time = cached_job.get("start_time")
            
            if status == "processing" and start_time:
                # Calculate elapsed time and estimated progress
                elapsed_time = time.time() - start_time
                elapsed_minutes = elapsed_time / 60
                
                # Estimate progress based on typical 15-20 minute completion time
                if elapsed_minutes < 15:
                    progress = int((elapsed_minutes / 15) * 90)  # Up to 90% in first 15 minutes
                elif elapsed_minutes < 20:
                    progress = int(90 + ((elapsed_minutes - 15) / 5) * 10)  # 90-100% in minutes 15-20
                else:
                    progress = 99  # Almost done but not quite
                
                return {
                    "status": "processing",
                    "progress": progress,
                    "journey_id": journey_id,
                    "journey_name": cached_job.get("journey_name", ""),
                    "message": f"Claude 4 is generating your journey map... ({elapsed_minutes:.1f} minutes elapsed)",
                    "elapsed_time_minutes": round(elapsed_minutes, 1),
                    "estimated_remaining_minutes": max(0, 18 - elapsed_minutes)
                }
            elif status == "completed":
                completion_time = cached_job.get("completion_time")
                total_time = completion_time - start_time if completion_time and start_time else 0
                return {
                    "status": "completed",
                    "progress": 100,
                    "journey_id": journey_id,
                    "journey_name": cached_job.get("journey_name", ""),
                    "message": "Claude 4 journey map completed successfully",
                    "total_processing_time_minutes": round(total_time / 60, 1) if total_time > 0 else None
                }
            elif status == "failed":
                error_msg = cached_job.get("error", "Unknown error")
                return {
                    "status": "failed",
                    "progress": 0,
                    "journey_id": journey_id,
                    "journey_name": cached_job.get("journey_name", ""),
                    "message": f"Journey map generation failed: {error_msg}",
                    "error": error_msg
                }
            else:
                return {
                    "status": status,
                    "progress": 0,
                    "journey_id": journey_id,
                    "journey_name": cached_job.get("journey_name", ""),
                    "message": f"Journey map status: {status}"
                }
        
        # If not in cache, assume it doesn't exist
        return {
            "status": "not_found",
            "progress": 0,
            "journey_id": journey_id,
            "message": "Claude 4 journey map not found"
        }
        
    except Exception as e:
        logger.exception("Error executing Claude 4 journey get status")
        return {
            "error": f"Error executing Claude 4 journey get status: {str(e)}",
            "status": "error"
        }

async def execute_claude4_journey_get_results(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Claude 4 journey get results tool"""
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
            status = cached_job.get("status", "unknown")
            
            if status != "completed":
                return {
                    "error": f"Journey map is not ready yet. Status: {status}. Use claude4_journey_get_status to check progress.",
                    "status": "not_ready",
                    "current_status": status
                }
            
            cached_result = cached_job.get("result", {})
            
            # Use the actual journey ID from Claude 4 service if available
            actual_journey_id = cached_job.get("actual_journey_id", journey_id)
            
            # Prepare the visualization URL to serve from our MCP service
            # We serve the HTML content through our own /result endpoint
            visualization_url = urljoin(
                os.environ.get("CLAUDE4_MCP_CLIENT_URL", "http://localhost:8506"),
                f"/result/{actual_journey_id}"
            )
            
            return {
                "journey_id": journey_id,
                "actual_journey_id": actual_journey_id,  # Include both IDs for debugging
                "journey_name": cached_job.get("journey_name", ""),
                "status": "completed",
                "visualization_url": visualization_url,
                "journey_map": cached_result.get("journey_map", {}),
                "analysis": cached_result.get("analysis", ""),
                "stages": cached_result.get("stages", []),
                "insights": cached_result.get("insights", []),
                "result": cached_result,
                "debug_info": {
                    "original_id": journey_id,
                    "claude4_actual_id": actual_journey_id,
                    "url_generated": visualization_url
                }
            }
        
        # If not in cache, inform user the journey was lost due to service restart
        logger.warning(f"Journey {journey_id} not found in local cache - likely lost due to service restart")
        
        # Since Claude 4 service doesn't persist results, we need to inform the user
        # that they'll need to regenerate the journey map
        
        # Final fallback - return helpful error message
        return {
            "error": f"Journey map {journey_id} not found - likely lost due to service restart",
            "status": "error",
            "troubleshooting": {
                "issue": "Journey maps are stored in memory and lost when service restarts",
                "solution": "Please regenerate the journey map using the same file",
                "cache_status": "not_found",
                "service_restart": "detected"
            }
        }
        
    except Exception as e:
        logger.exception("Error executing Claude 4 journey get results")
        return {
            "error": f"Error executing Claude 4 journey get results: {str(e)}",
            "status": "error"
        }

async def execute_claude4_journey_list_maps(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute Claude 4 journey list maps tool"""
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
        logger.exception("Error executing Claude 4 journey list maps")
        return {
            "error": f"Error executing Claude 4 journey list maps: {str(e)}",
            "status": "error"
        }

# Legacy endpoints (for backward compatibility)

# MCP Tools definition
@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    tools = [
        MCPToolSpec(
            name="claude4_journey_upload_file",
            description="Upload a file for journey mapping with Claude 4",
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
            name="claude4_journey_generate_map",
            description="Generate a customer journey map from uploaded file using Claude 4",
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
            name="claude4_journey_get_status",
            description="Check the status of a Claude 4 journey map generation",
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
            name="claude4_journey_get_results",
            description="Get the results of a completed Claude 4 journey mapping",
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
            name="claude4_journey_list_maps",
            description="List all available Claude 4 journey maps",
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

@app.post("/mcp/invoke/claude4_journey_upload_file", response_model=Dict[str, Any])
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

@app.post("/mcp/invoke/claude4_journey_generate_map", response_model=Dict[str, Any])
async def invoke_generate_map(
    background_tasks: BackgroundTasks,
    file_id: str = Form(...),
    journey_name: str = Form(...),
    description: str = Form("")
):
    """MCP endpoint to generate a journey map from an uploaded file"""
    try:
        # Check if file exists in cache
        file_path = file_cache.get(file_id)
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail=f"File with ID {file_id} not found. Please upload the file first."
            )
            
        # Create multipart form data for the file upload to Journey Mapper
        with open(file_path, "rb") as f:
            file_name = os.path.basename(file_path).split("_", 1)[1]  # Remove file_id_ prefix
            files = {"file": (file_name, f, "application/octet-stream")}
            
            data = {
                "journey_name": journey_name,
                "description": description
            }
            
            # Send request to Journey Mapper
            response = requests.post(
                urljoin(JOURNEY_MAPPER_URL, "/api/upload"),
                files=files,
                data=data
            )
            
        # Check response
        if response.status_code != 200:
            logger.error(f"Error uploading to Journey Mapper: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Journey Mapper upload error: {response.text}"
            )
            
        # Parse response to get file ID in Journey Mapper system
        result = response.json()
        journey_mapper_file_id = result.get("file_id")
        
        if not journey_mapper_file_id:
            raise HTTPException(
                status_code=500,
                detail="No file ID returned from Journey Mapper"
            )
            
        # Now generate the journey map
        generation_data = {
            "file_id": journey_mapper_file_id,
            "journey_name": journey_name,
            "description": description
        }
        
        generation_response = requests.post(
            urljoin(JOURNEY_MAPPER_URL, "/api/generate-journey"),
            json=generation_data
        )
        
        if generation_response.status_code != 200:
            logger.error(f"Error generating journey: {generation_response.text}")
            raise HTTPException(
                status_code=generation_response.status_code,
                detail=f"Journey generation error: {generation_response.text}"
            )
            
        # Parse response
        generation_result = generation_response.json()
        journey_id = generation_result.get("journey_id")
        
        if not journey_id:
            raise HTTPException(
                status_code=500,
                detail="No journey ID returned from Journey Mapper"
            )
            
        # Cache journey details for future reference
        job_cache[journey_id] = {
            "file_id": file_id,
            "journey_mapper_file_id": journey_mapper_file_id,
            "journey_name": journey_name,
            "description": description
        }
        
        # Schedule cleanup of local file after some time
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

@app.post("/mcp/invoke/claude4_journey_get_status", response_model=Dict[str, Any])
async def invoke_get_status(journey_id: str = Form(...)):
    """MCP endpoint to check journey map generation status"""
    try:
        # Send status request to Journey Mapper
        response = requests.get(
            urljoin(JOURNEY_MAPPER_URL, f"/api/journey/{journey_id}/status")
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting journey status: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting journey status: {response.text}"
            )
            
        # Parse response
        result = response.json()
        
        # Extract relevant information
        status_info = {
            "status": result.get("status", "unknown"),
            "progress": result.get("progress", 0),
            "message": result.get("message", "")
        }
        
        return status_info
        
    except Exception as e:
        logger.exception("Error getting journey status")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting journey status: {str(e)}"
        )

@app.post("/mcp/invoke/claude4_journey_get_results", response_model=Dict[str, Any])
async def invoke_get_results(journey_id: str = Form(...)):
    """MCP endpoint to get journey mapping results"""
    try:
        # Send results request to Journey Mapper
        response = requests.get(
            urljoin(JOURNEY_MAPPER_URL, f"/api/journey/{journey_id}")
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting journey results: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting journey results: {response.text}"
            )
            
        # Parse response
        result = response.json()
        
        # Prepare the visualization URL
        visualization_url = urljoin(
            os.environ.get("JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8090"),
            f"/journey/{journey_id}/view"
        )
        
        # Extract journey stages and insights
        journey_map = result.get("journey_map", {})
        stages = journey_map.get("stages", [])
        insights = journey_map.get("insights", [])
        
        # Process stages to make them more concise
        processed_stages = []
        for stage in stages:
            processed_stages.append({
                "name": stage.get("name", ""),
                "emotions": stage.get("emotions", []),
                "activities": stage.get("activities", []),
                "pain_points": stage.get("pain_points", []),
                "opportunities": stage.get("opportunities", [])
            })
            
        return {
            "journey_map": journey_map,
            "visualization_url": visualization_url,
            "stages": processed_stages,
            "insights": insights
        }
        
    except Exception as e:
        logger.exception("Error getting journey results")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting journey results: {str(e)}"
        )

@app.post("/mcp/invoke/claude4_journey_list_maps", response_model=Dict[str, Any])
async def invoke_list_maps():
    """MCP endpoint to list all available journey maps"""
    try:
        # Send request to Journey Mapper
        response = requests.get(
            urljoin(JOURNEY_MAPPER_URL, "/api/journey-maps")
        )
        
        if response.status_code != 200:
            logger.error(f"Error listing journey maps: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error listing journey maps: {response.text}"
            )
            
        # Parse response
        result = response.json()
        journey_maps = result.get("journeys", [])
        
        # Process journey maps to make them more concise
        processed_maps = []
        for journey_map in journey_maps:
            processed_maps.append({
                "id": journey_map.get("id", ""),
                "name": journey_map.get("name", ""),
                "created_at": journey_map.get("created_at", ""),
                "status": journey_map.get("status", "unknown")
            })
            
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
    return {"status": "healthy", "service": "claude4-journey-mcp"}

@app.get("/result/{journey_id}")
async def get_journey_result_html(journey_id: str):
    """Serve the journey map HTML content directly"""
    try:
        if journey_id not in job_cache:
            # Create an HTML error page instead of JSON error
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Journey Map Not Found</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                    .error-container {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .error-title {{ color: #e74c3c; font-size: 24px; margin-bottom: 20px; }}
                    .error-message {{ color: #2c3e50; font-size: 16px; line-height: 1.6; }}
                    .solution {{ background: #ecf0f1; padding: 15px; border-radius: 4px; margin-top: 20px; }}
                    .journey-id {{ font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 3px; }}
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1 class="error-title">🗺️ Journey Map Not Found</h1>
                    <p class="error-message">
                        The journey map with ID <span class="journey-id">{journey_id}</span> could not be found.
                        This usually happens when the service was restarted and the in-memory cache was cleared.
                    </p>
                    <div class="solution">
                        <strong>💡 Solution:</strong> Please return to the chatbot and regenerate the journey map using the same file. 
                        Journey maps are processed fresh each time to ensure you get the latest AI analysis.
                    </div>
                </div>
            </body>
            </html>
            """
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=error_html, status_code=404)
        
        cached_job = job_cache[journey_id]
        
        if cached_job.get("status") != "completed":
            # Create an HTML processing status page
            status = cached_job.get("status", "unknown")
            processing_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Journey Map Processing</title>
                <meta http-equiv="refresh" content="30">
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                    .processing-container {{ background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }}
                    .processing-title {{ color: #3498db; font-size: 24px; margin-bottom: 20px; }}
                    .spinner {{ margin: 20px auto; width: 40px; height: 40px; border: 4px solid #ecf0f1; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }}
                    @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
                    .status {{ color: #2c3e50; font-size: 16px; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="processing-container">
                    <h1 class="processing-title">🔄 Processing Journey Map</h1>
                    <div class="spinner"></div>
                    <p class="status">Status: {status}</p>
                    <p>Your journey map is being generated by Claude 4. This page will refresh automatically.</p>
                </div>
            </body>
            </html>
            """
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=processing_html, status_code=202)
        
        result = cached_job.get("result", {})
        html_content = result.get("journey_map_html")
        
        if not html_content:
            raise HTTPException(status_code=404, detail=f"No HTML content found for journey {journey_id}")
        
        # Return the HTML content directly with proper content type
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error serving journey result {journey_id}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Claude 4 Journey Mapper MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp": "JSON-RPC 2.0 endpoint for tool discovery and execution",
            "mcp/tools": "Get available tools (legacy)",
            "mcp/invoke/claude4_journey_upload_file": "Upload a file (legacy)",
            "mcp/invoke/claude4_journey_generate_map": "Generate a journey map (legacy)",
            "mcp/invoke/claude4_journey_get_status": "Check journey generation status (legacy)",
            "mcp/invoke/claude4_journey_get_results": "Get journey results (legacy)",
            "mcp/invoke/claude4_journey_list_maps": "List all journey maps (legacy)"
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
    
    # Start a background thread for cleanup
    cleanup_thread = threading.Thread(target=cleanup_temp_files, daemon=True)
    cleanup_thread.start()
    
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)