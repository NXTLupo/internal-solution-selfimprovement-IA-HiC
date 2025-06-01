#!/usr/bin/env python3
"""
OpenAI Journey Mapper MCP Service
---------------------------------
This microservice provides a Model Context Protocol (MCP) wrapper for the OpenAI Journey Mapper.
It enables the AI agent to interact with the OpenAI Journey Mapper through a standardized API.

The service provides the following endpoints:
- GET /health: Health check endpoint
- POST /upload: Upload files to the OpenAI Journey Mapper
- POST /create: Create a journey map
- GET /list: List all journey maps
- GET /journey/{journey_id}: Get a specific journey map by ID
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from pydantic import BaseModel
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

# MCP Tool Model
class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Job tracking cache
job_cache: Dict[str, Dict[str, Any]] = {}

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
            {"path": "/health", "method": "GET", "description": "Health check endpoint"},
            {"path": "/upload", "method": "POST", "description": "Upload files to the Journey Mapper"},
            {"path": "/create", "method": "POST", "description": "Create a journey map"},
            {"path": "/list", "method": "GET", "description": "List all journey maps"},
            {"path": "/journey/{journey_id}", "method": "GET", "description": "Get a specific journey map by ID"},
            {"path": "/mcp/tools", "method": "GET", "description": "Get available MCP tools"},
            {"path": "/mcp/invoke/{tool_name}", "method": "POST", "description": "Invoke an MCP tool"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8505))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)