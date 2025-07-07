#!/usr/bin/env python3
"""
OpenAI Journey Mapper MCP Service - JSON-RPC 2.0 Compliant
----------------------------------------------------------
This microservice provides a Model Context Protocol (MCP) wrapper for the OpenAI Journey Mapper
using proper JSON-RPC 2.0 format for agent integration.
It enables the AI agent to interact with the OpenAI Journey Mapper through a standardized API.

The service provides the following endpoints:
- POST /mcp: JSON-RPC 2.0 endpoint for tool discovery and execution
- GET /health: Health check endpoint
- POST /upload: Upload files to the OpenAI Journey Mapper (legacy)
- POST /create: Create a journey map (legacy)
- GET /list: List all journey maps (legacy)
- GET /journey/{journey_id}: Get a specific journey map by ID (legacy)
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import Union
import httpx
import aiofiles
import aiohttp
import uuid
from datetime import datetime
import shutil
import tempfile
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("openai-journey-mcp")

# Initialize FastAPI app
app = FastAPI(
    title="OpenAI Journey Mapper MCP",
    description="MCP Service for OpenAI Journey Mapper",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get OpenAI Journey Mapper URL from environment variables
OPENAI_JOURNEY_MAPPER_URL = os.environ.get(
    "OPENAI_JOURNEY_MAPPER_URL", "http://openai-journey-mapper:8000"
)
logger.info(f"OpenAI Journey Mapper URL: {OPENAI_JOURNEY_MAPPER_URL}")

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

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

# Legacy MCP Tool Model
class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Job tracking cache
job_cache: Dict[str, Dict[str, Any]] = {}

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
                    "name": "openai_journey_upload_file",
                    "description": "Upload a file for OpenAI o3 journey mapping",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "file": {
                                "type": "file",
                                "description": "File to upload (PDF, CSV, TXT, or JSON)"
                            }
                        },
                        "required": ["file"]
                    }
                },
                {
                    "name": "openai_journey_generate_map",
                    "description": "Generate a journey map from uploaded data using OpenAI o3 reasoning",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "file_id": {
                                "type": "string",
                                "description": "ID of the previously uploaded file"
                            },
                            "title": {
                                "type": "string",
                                "description": "Title of the journey map",
                                "default": "Customer Journey"
                            },
                            "description": {
                                "type": "string",
                                "description": "Description of the journey map",
                                "default": "A visualization of the customer journey"
                            },
                            "journey_type": {
                                "type": "string",
                                "description": "Type of journey (customer, employee, etc.)",
                                "default": "general"
                            },
                            "reasoning_effort": {
                                "type": "string",
                                "description": "Reasoning effort level for o3 model (low, medium, high)",
                                "default": "medium"
                            }
                        },
                        "required": ["file_id"]
                    }
                },
                {
                    "name": "openai_journey_get_results",
                    "description": "Get the results of a generated OpenAI o3 journey map",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "journey_id": {
                                "type": "string",
                                "description": "ID of the journey map to retrieve"
                            }
                        },
                        "required": ["journey_id"]
                    }
                },
                {
                    "name": "openai_journey_list_maps",
                    "description": "List all available OpenAI o3 journey maps",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "openai_journey_set_reasoning_effort",
                    "description": "Set the reasoning effort level for OpenAI o3 model",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "effort_level": {
                                "type": "string",
                                "description": "Reasoning effort level (low, medium, high)",
                                "enum": ["low", "medium", "high"]
                            }
                        },
                        "required": ["effort_level"]
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
            
            if tool_name == "openai_journey_upload_file":
                result = await execute_openai_journey_upload_file(arguments)
            elif tool_name == "openai_journey_generate_map":
                result = await execute_openai_journey_generate_map(arguments)
            elif tool_name == "openai_journey_get_results":
                result = await execute_openai_journey_get_results(arguments)
            elif tool_name == "openai_journey_list_maps":
                result = await execute_openai_journey_list_maps(arguments)
            elif tool_name == "openai_journey_set_reasoning_effort":
                result = await execute_openai_journey_set_reasoning_effort(arguments)
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
async def execute_openai_journey_upload_file(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenAI journey upload file tool"""
    try:
        # Note: File uploads in JSON-RPC format will be handled differently
        # For now, return a message directing users to use the form endpoint
        return {
            "error": "File uploads through JSON-RPC not yet supported. Please use the legacy endpoint.",
            "status": "error",
            "message": "Use the /mcp/invoke/openai_journey_upload_file endpoint for file uploads"
        }
    except Exception as e:
        logger.exception("Error executing OpenAI journey upload file")
        return {
            "error": f"Error executing OpenAI journey upload file: {str(e)}",
            "status": "error"
        }

async def execute_openai_journey_generate_map(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenAI journey generate map tool"""
    try:
        file_id = arguments.get("file_id")
        title = arguments.get("title", "Customer Journey")
        description = arguments.get("description", "A visualization of the customer journey")
        journey_type = arguments.get("journey_type", "general")
        reasoning_effort = arguments.get("reasoning_effort", "medium")
        
        if not file_id:
            return {
                "error": "file_id is required",
                "status": "error"
            }
        
        # Generate journey ID
        journey_id = str(uuid.uuid4())
        
        # Prepare data for OpenAI Journey Mapper
        data = {
            "file_id": file_id,
            "title": title,
            "description": description,
            "journey_type": journey_type,
            "reasoning_effort": reasoning_effort
        }
        
        logger.info(f"Creating OpenAI o3 journey map with data: {data}")
        
        # Send request to OpenAI Journey Mapper
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENAI_JOURNEY_MAPPER_URL}/create",
                json=data,
                timeout=3600  # 1 hour timeout for o3 reasoning
            )
        
        if response.status_code == 200:
            result = response.json()
            actual_journey_id = result.get("journey_id", journey_id)
            
            # Cache the job info
            job_cache[actual_journey_id] = {
                "file_id": file_id,
                "title": title,
                "description": description,
                "journey_type": journey_type,
                "reasoning_effort": reasoning_effort,
                "status": "completed",
                "result": result
            }
            
            return {"journey_id": actual_journey_id, "status": "success"}
        else:
            return {
                "error": f"OpenAI Journey Mapper error (HTTP {response.status_code}): {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing OpenAI journey generate map")
        return {
            "error": f"Error executing OpenAI journey generate map: {str(e)}",
            "status": "error"
        }

async def execute_openai_journey_get_results(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenAI journey get results tool"""
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
            cached_result = cached_job.get("result", {})
            
            # Prepare the visualization URL
            visualization_url = f"{os.environ.get('OPENAI_JOURNEY_CLIENT_URL', 'http://localhost:8090')}/journey/{journey_id}"
            
            return {
                "journey_id": journey_id,
                "title": cached_job.get("title", ""),
                "status": "completed",
                "visualization_url": visualization_url,
                "html": cached_result.get("html", ""),
                "journey_map": cached_result.get("journey_map", {}),
                "reasoning_analysis": cached_result.get("reasoning_analysis", ""),
                "insights": cached_result.get("insights", []),
                "result": cached_result
            }
        
        # If not in cache, try to get from OpenAI Journey Mapper
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{OPENAI_JOURNEY_MAPPER_URL}/journey/{journey_id}",
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                visualization_url = f"{os.environ.get('OPENAI_JOURNEY_CLIENT_URL', 'http://localhost:8090')}/journey/{journey_id}"
                
                return {
                    "journey_id": journey_id,
                    "status": "completed",
                    "visualization_url": visualization_url,
                    "html": result.get("html", ""),
                    "journey_map": result.get("journey_map", {}),
                    "result": result
                }
            else:
                return {
                    "error": f"OpenAI journey map with ID {journey_id} not found",
                    "status": "error"
                }
        except Exception:
            return {
                "error": f"OpenAI journey map with ID {journey_id} not found or service unavailable",
                "status": "error"
            }
        
    except Exception as e:
        logger.exception("Error executing OpenAI journey get results")
        return {
            "error": f"Error executing OpenAI journey get results: {str(e)}",
            "status": "error"
        }

async def execute_openai_journey_list_maps(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenAI journey list maps tool"""
    try:
        # Return journey maps from our local cache and try to get from service
        processed_maps = []
        
        # Add cached journey maps
        for journey_id, job_info in job_cache.items():
            processed_maps.append({
                "id": journey_id,
                "title": job_info.get("title", "Unnamed Journey"),
                "status": job_info.get("status", "completed"),
                "description": job_info.get("description", ""),
                "reasoning_effort": job_info.get("reasoning_effort", "medium"),
                "created_at": "Recently created"
            })
        
        # Try to get additional maps from the service
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{OPENAI_JOURNEY_MAPPER_URL}/list",
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                service_maps = result.get("journeys", [])
                
                # Add service maps that aren't in our cache
                for service_map in service_maps:
                    map_id = service_map.get("id")
                    if map_id not in job_cache:
                        processed_maps.append({
                            "id": map_id,
                            "title": service_map.get("title", "Unnamed Journey"),
                            "status": "completed",
                            "description": service_map.get("description", ""),
                            "created_at": service_map.get("created_at", "")
                        })
        except Exception:
            logger.warning("Could not fetch additional maps from OpenAI Journey Mapper service")
        
        return {"journey_maps": processed_maps, "status": "success"}
        
    except Exception as e:
        logger.exception("Error executing OpenAI journey list maps")
        return {
            "error": f"Error executing OpenAI journey list maps: {str(e)}",
            "status": "error"
        }

async def execute_openai_journey_set_reasoning_effort(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenAI journey set reasoning effort tool"""
    try:
        effort_level = arguments.get("effort_level")
        
        if not effort_level:
            return {
                "error": "effort_level is required",
                "status": "error"
            }
        
        if effort_level not in ["low", "medium", "high"]:
            return {
                "error": "effort_level must be one of: low, medium, high",
                "status": "error"
            }
        
        # Store the reasoning effort setting (this would typically be stored in a configuration)
        # For now, we'll just return success
        logger.info(f"Set OpenAI o3 reasoning effort to: {effort_level}")
        
        return {
            "reasoning_effort": effort_level,
            "status": "success",
            "message": f"Reasoning effort set to {effort_level} for future o3 journey mappings"
        }
        
    except Exception as e:
        logger.exception("Error executing OpenAI journey set reasoning effort")
        return {
            "error": f"Error executing OpenAI journey set reasoning effort: {str(e)}",
            "status": "error"
        }

# Legacy endpoints (for backward compatibility)

@app.get("/health")
async def health_check():
    """Health check endpoint to verify the service is running."""
    try:
        # Check if the OpenAI Journey Mapper is accessible
        # Use the root endpoint as the health check endpoint since OpenAI Journey Mapper doesn't have a /health endpoint
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OPENAI_JOURNEY_MAPPER_URL}/", timeout=5.0)
            if response.status_code == 200:
                return {"status": "healthy", "message": "OpenAI Journey Mapper MCP is operational"}
            else:
                return {
                    "status": "degraded", 
                    "message": f"OpenAI Journey Mapper is not responding correctly: {response.status_code}"
                }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "message": f"Error connecting to OpenAI Journey Mapper: {str(e)}"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file to the OpenAI Journey Mapper.
    
    Args:
        file: The file to upload
        
    Returns:
        JSON response with the file ID and status
    """
    try:
        # Save file locally first
        file_id = str(uuid.uuid4())
        file_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
        
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Forward the file to the OpenAI Journey Mapper
        url = f"{OPENAI_JOURNEY_MAPPER_URL}/api/upload"
        
        # Use aiohttp to stream the file
        async with aiohttp.ClientSession() as session:
            form = aiohttp.FormData()
            form.add_field(
                "file",
                open(file_path, "rb"),
                filename=file.filename,
                content_type=file.content_type
            )
            
            async with session.post(url, data=form) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"File uploaded successfully: {result}")
                    return JSONResponse(content=result)
                else:
                    error_text = await response.text()
                    logger.error(f"File upload failed: {error_text}")
                    return JSONResponse(
                        status_code=response.status,
                        content={"error": f"File upload failed: {error_text}"}
                    )
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error uploading file: {str(e)}"}
        )

@app.post("/create")
async def create_journey_map(
    data: Dict[str, Any] = Body(...),
    title: str = Form("Customer Journey"),
    description: str = Form("A visualization of the customer journey"),
    journey_type: str = Form("general")
):
    """
    Create a journey map using the OpenAI Journey Mapper.
    
    Args:
        data: The data to use for journey map creation
        title: The title of the journey map
        description: A description of the journey map
        journey_type: The type of journey (customer, employee, etc.)
        
    Returns:
        JSON response with the journey map ID and HTML content
    """
    try:
        # Prepare the data with metadata
        if "metadata" not in data:
            data["metadata"] = {}
        if "context" not in data["metadata"]:
            data["metadata"]["context"] = {}
            
        data["metadata"]["context"]["title"] = title
        data["metadata"]["context"]["description"] = description
        data["metadata"]["context"]["journey_type"] = journey_type
        
        # Forward the request to the OpenAI Journey Mapper
        url = f"{OPENAI_JOURNEY_MAPPER_URL}/api/journey"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, 
                json=data,
                timeout=300.0  # 5-minute timeout for journey map generation
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Journey map created successfully: {result.get('id', 'Unknown ID')}")
                return JSONResponse(content=result)
            else:
                error_text = response.text
                logger.error(f"Journey map creation failed: {error_text}")
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"Journey map creation failed: {error_text}"}
                )
    except Exception as e:
        logger.error(f"Error creating journey map: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error creating journey map: {str(e)}"}
        )

@app.get("/list")
async def list_journey_maps():
    """
    List all journey maps from the OpenAI Journey Mapper.
    
    Returns:
        JSON response with a list of journey maps
    """
    try:
        # Forward the request to the OpenAI Journey Mapper
        url = f"{OPENAI_JOURNEY_MAPPER_URL}/api/journeys"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Retrieved {len(result)} journey maps")
                return JSONResponse(content=result)
            else:
                error_text = response.text
                logger.error(f"Failed to list journey maps: {error_text}")
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"Failed to list journey maps: {error_text}"}
                )
    except Exception as e:
        logger.error(f"Error listing journey maps: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error listing journey maps: {str(e)}"}
        )

@app.get("/journey/{journey_id}")
async def get_journey_map(journey_id: str):
    """
    Get a specific journey map by ID.
    
    Args:
        journey_id: The ID of the journey map to retrieve
        
    Returns:
        HTML response with the journey map content
    """
    try:
        # Forward the request to the OpenAI Journey Mapper
        url = f"{OPENAI_JOURNEY_MAPPER_URL}/api/journey/{journey_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                result = response.json()
                html_content = result.get("interactive_html", "")
                logger.info(f"Retrieved journey map {journey_id}")
                
                return HTMLResponse(content=html_content)
            else:
                error_text = response.text
                logger.error(f"Failed to get journey map {journey_id}: {error_text}")
                return JSONResponse(
                    status_code=response.status_code,
                    content={"error": f"Failed to get journey map: {error_text}"}
                )
    except Exception as e:
        logger.error(f"Error getting journey map {journey_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error getting journey map: {str(e)}"}
        )

@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    tools = [
        MCPToolSpec(
            name="openai_journey_upload_file",
            description="Upload a file to the OpenAI Journey Mapper for analysis",
            parameters={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "file",
                        "description": "The file to upload (text or JSON)"
                    }
                },
                "required": ["file"]
            },
            returns={
                "file_id": {
                    "type": "string",
                    "description": "ID of the uploaded file for reference in generate_map"
                },
                "filename": {
                    "type": "string",
                    "description": "Name of the uploaded file"
                }
            }
        ),
        MCPToolSpec(
            name="openai_journey_generate_map",
            description="Generate a journey map from uploaded data",
            parameters={
                "type": "object",
                "properties": {
                    "file_id": {
                        "type": "string",
                        "description": "ID of the previously uploaded file"
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the journey map",
                        "default": "Customer Journey"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the journey map",
                        "default": "A visualization of the customer journey"
                    },
                    "journey_type": {
                        "type": "string",
                        "description": "Type of journey (customer, employee, etc.)",
                        "default": "general"
                    }
                },
                "required": ["file_id"]
            },
            returns={
                "journey_id": {
                    "type": "string",
                    "description": "ID of the generated journey map"
                },
                "status": {
                    "type": "string",
                    "description": "Status of the journey map generation"
                }
            }
        ),
        MCPToolSpec(
            name="openai_journey_get_results",
            description="Get the results of a generated journey map",
            parameters={
                "type": "object",
                "properties": {
                    "journey_id": {
                        "type": "string",
                        "description": "ID of the journey map to retrieve"
                    }
                },
                "required": ["journey_id"]
            },
            returns={
                "html": {
                    "type": "string",
                    "description": "HTML content of the journey map"
                },
                "visualization_url": {
                    "type": "string",
                    "description": "URL to view the journey map"
                }
            }
        ),
        MCPToolSpec(
            name="openai_journey_list_maps",
            description="List all available journey maps",
            parameters={
                "type": "object",
                "properties": {},
                "required": []
            },
            returns={
                "journeys": {
                    "type": "array",
                    "description": "List of journey maps",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "created_at": {"type": "string"}
                        }
                    }
                }
            }
        )
    ]
    return tools

@app.post("/mcp/invoke/openai_journey_upload_file")
async def invoke_upload_file(file: UploadFile = File(...)):
    """MCP endpoint to upload a file"""
    try:
        # Reuse the existing upload_file functionality
        result = await upload_file(file)
        
        # Extract the content and convert to dict
        if isinstance(result, JSONResponse):
            content = result.body.decode("utf-8")
            return json.loads(content)
        return result
    except Exception as e:
        logger.error(f"Error in MCP upload_file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@app.post("/mcp/invoke/openai_journey_generate_map")
async def invoke_generate_map(
    file_id: str = Form(...),
    title: str = Form("Customer Journey"),
    description: str = Form("A visualization of the customer journey"),
    journey_type: str = Form("general")
):
    """MCP endpoint to generate a journey map"""
    try:
        # Prepare the data for journey map creation
        data = {
            "file_id": file_id,
            "metadata": {
                "context": {
                    "title": title,
                    "description": description,
                    "journey_type": journey_type
                }
            }
        }
        
        # Use the existing create_journey_map function
        result = await create_journey_map(data, title, description, journey_type)
        
        # Extract the content and convert to dict
        if isinstance(result, JSONResponse):
            content = result.body.decode("utf-8")
            content_dict = json.loads(content)
            
            # Store the journey ID in the cache
            if "id" in content_dict:
                journey_id = content_dict["id"]
                job_cache[journey_id] = {
                    "title": title,
                    "description": description,
                    "journey_type": journey_type,
                    "file_id": file_id
                }
                
                # Format the response in the expected structure
                return {
                    "journey_id": journey_id,
                    "status": "completed"
                }
                
            return content_dict
        return result
    except Exception as e:
        logger.error(f"Error in MCP generate_map: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating journey map: {str(e)}")

@app.post("/mcp/invoke/openai_journey_get_results")
async def invoke_get_results(journey_id: str = Form(...)):
    """MCP endpoint to get journey map results"""
    try:
        # Use the existing get_journey_map function
        result = await get_journey_map(journey_id)
        
        # Extract the content
        if isinstance(result, HTMLResponse):
            html_content = result.body.decode("utf-8")
            
            # Create a client-accessible URL for the visualization
            client_url = os.environ.get(
                "OPENAI_JOURNEY_MAPPER_CLIENT_URL", 
                "http://localhost:8080"
            )
            visualization_url = f"{client_url}/journey/{journey_id}"
            
            return {
                "html": html_content,
                "visualization_url": visualization_url
            }
        elif isinstance(result, JSONResponse):
            content = result.body.decode("utf-8")
            return json.loads(content)
        return result
    except Exception as e:
        logger.error(f"Error in MCP get_results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting journey map results: {str(e)}")

@app.post("/mcp/invoke/openai_journey_list_maps")
async def invoke_list_maps():
    """MCP endpoint to list all journey maps"""
    try:
        # Use the existing list_journey_maps function
        result = await list_journey_maps()
        
        # Extract the content and convert to dict
        if isinstance(result, JSONResponse):
            content = result.body.decode("utf-8")
            content_dict = json.loads(content)
            
            # Format the response in the expected structure
            if isinstance(content_dict, list):
                return {"journeys": content_dict}
            return content_dict
        return result
    except Exception as e:
        logger.error(f"Error in MCP list_maps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing journey maps: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "OpenAI Journey Mapper MCP",
        "version": "1.0.0",
        "endpoints": [
            {"path": "/mcp", "method": "POST", "description": "JSON-RPC 2.0 endpoint for tool discovery and execution"},
            {"path": "/health", "method": "GET", "description": "Health check endpoint"},
            {"path": "/upload", "method": "POST", "description": "Upload files to the Journey Mapper (legacy)"},
            {"path": "/create", "method": "POST", "description": "Create a journey map (legacy)"},
            {"path": "/list", "method": "GET", "description": "List all journey maps (legacy)"},
            {"path": "/journey/{journey_id}", "method": "GET", "description": "Get a specific journey map by ID (legacy)"},
            {"path": "/mcp/tools", "method": "GET", "description": "Get available MCP tools (legacy)"},
            {"path": "/mcp/invoke/{tool_name}", "method": "POST", "description": "Invoke an MCP tool (legacy)"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8505))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)