"""
Claude 4 Journey Mapper MCP Service
----------------------------------
This service wraps the Claude 4 Journey Mapper tool in a Model Context Protocol (MCP)
compatible interface, allowing the agent to use it for customer journey mapping.
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

# MCP Tools definition
@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    tools = [
        MCPToolSpec(
            name="claude4_journey.upload_file",
            description="Upload a file for journey mapping with Claude 4",
            parameters={
                "file": {
                    "type": "file",
                    "description": "File to upload (PDF, CSV, TXT, or JSON)"
                },
                "file_name": {
                    "type": "string",
                    "description": "Name of the file (if not provided in file object)"
                }
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
            name="claude4_journey.generate_map",
            description="Generate a customer journey map from uploaded file using Claude 4",
            parameters={
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
            returns={
                "journey_id": {
                    "type": "string",
                    "description": "ID of the generated journey for tracking"
                }
            }
        ),
        MCPToolSpec(
            name="claude4_journey.get_status",
            description="Check the status of a Claude 4 journey map generation",
            parameters={
                "journey_id": {
                    "type": "string",
                    "description": "Journey ID from a previous generation request"
                }
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
            name="claude4_journey.get_results",
            description="Get the results of a completed Claude 4 journey mapping",
            parameters={
                "journey_id": {
                    "type": "string",
                    "description": "Journey ID from a previous generation request"
                }
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
            name="claude4_journey.list_maps",
            description="List all available Claude 4 journey maps",
            parameters={},
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

@app.post("/mcp/invoke/claude4_journey.upload_file", response_model=Dict[str, Any])
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

@app.post("/mcp/invoke/claude4_journey.generate_map", response_model=Dict[str, Any])
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

@app.post("/mcp/invoke/claude4_journey.get_status", response_model=Dict[str, Any])
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

@app.post("/mcp/invoke/claude4_journey.get_results", response_model=Dict[str, Any])
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

@app.post("/mcp/invoke/claude4_journey.list_maps", response_model=Dict[str, Any])
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

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Claude 4 Journey Mapper MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp/tools": "Get available tools",
            "mcp/invoke/claude4_journey.upload_file": "Upload a file",
            "mcp/invoke/claude4_journey.generate_map": "Generate a journey map",
            "mcp/invoke/claude4_journey.get_status": "Check journey generation status",
            "mcp/invoke/claude4_journey.get_results": "Get journey results",
            "mcp/invoke/claude4_journey.list_maps": "List all journey maps"
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