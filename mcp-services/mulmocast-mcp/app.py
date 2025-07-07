"""
MulmoCast MCP Service - JSON-RPC 2.0 Compliant
----------------------------------------------
This service wraps the MulmoCast multimedia content generation tool in a Model Context Protocol (MCP)
compatible interface using proper JSON-RPC 2.0 format for agent integration.
"""

import os
import json
import uuid
import tempfile
import requests
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("mulmocast-mcp")

# Configuration
MULMOCAST_URL = os.environ.get("MULMOCAST_URL", "http://mulmocast:5008")

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

# Legacy Models
class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="MulmoCast MCP Service",
    description="MCP-compatible service for MulmoCast multimedia content generation",
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

# Cache for job status
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
                    "name": "mulmocast_get_templates",
                    "description": "Get available MulmoCast content templates",
                    "inputSchema": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                },
                {
                    "name": "mulmocast_generate_script",
                    "description": "Generate a MulmoScript from topic and template",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "template": {
                                "type": "string",
                                "description": "Template type (business, children_book, ghibli_comic, podcast_standard, etc.)"
                            },
                            "topic": {
                                "type": "string", 
                                "description": "Topic or title for the content"
                            },
                            "urls": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional URLs for research (for some templates)",
                                "default": []
                            },
                            "interactive": {
                                "type": "boolean",
                                "description": "Whether to use interactive mode",
                                "default": False
                            }
                        },
                        "required": ["template", "topic"]
                    }
                },
                {
                    "name": "mulmocast_generate_audio",
                    "description": "Generate audio from a MulmoScript file",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "script_path": {
                                "type": "string",
                                "description": "Path to the MulmoScript JSON file"
                            },
                            "force": {
                                "type": "boolean",
                                "description": "Force regeneration even if files exist",
                                "default": False
                            }
                        },
                        "required": ["script_path"]
                    }
                },
                {
                    "name": "mulmocast_generate_images",
                    "description": "Generate images from a MulmoScript file",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "script_path": {
                                "type": "string",
                                "description": "Path to the MulmoScript JSON file"
                            },
                            "force": {
                                "type": "boolean",
                                "description": "Force regeneration even if files exist",
                                "default": False
                            }
                        },
                        "required": ["script_path"]
                    }
                },
                {
                    "name": "mulmocast_generate_movie",
                    "description": "Generate a video/movie from a MulmoScript file",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "script_path": {
                                "type": "string",
                                "description": "Path to the MulmoScript JSON file"
                            },
                            "force": {
                                "type": "boolean",
                                "description": "Force regeneration even if files exist",
                                "default": False
                            }
                        },
                        "required": ["script_path"]
                    }
                },
                {
                    "name": "mulmocast_create_complete_workflow",
                    "description": "Complete workflow: generate script and create multimedia content",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "template": {
                                "type": "string",
                                "description": "Template type (business, children_book, ghibli_comic, podcast_standard, etc.)"
                            },
                            "topic": {
                                "type": "string",
                                "description": "Topic or title for the content"
                            },
                            "output_formats": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "enum": ["audio", "images", "movie", "pdf"]
                                },
                                "description": "Output formats to generate",
                                "default": ["audio"]
                            },
                            "urls": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional URLs for research",
                                "default": []
                            }
                        },
                        "required": ["template", "topic"]
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
            
            if tool_name == "mulmocast_get_templates":
                result = await execute_mulmocast_get_templates(arguments)
            elif tool_name == "mulmocast_generate_script":
                result = await execute_mulmocast_generate_script(arguments)
            elif tool_name == "mulmocast_generate_audio":
                result = await execute_mulmocast_generate_audio(arguments)
            elif tool_name == "mulmocast_generate_images":
                result = await execute_mulmocast_generate_images(arguments)
            elif tool_name == "mulmocast_generate_movie":
                result = await execute_mulmocast_generate_movie(arguments)
            elif tool_name == "mulmocast_create_complete_workflow":
                result = await execute_mulmocast_create_complete_workflow(arguments)
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
async def execute_mulmocast_get_templates(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast get templates tool"""
    try:
        # Get available templates from MulmoCast service
        response = requests.get(
            urljoin(MULMOCAST_URL, "/api/templates"),
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return {"templates": result.get("templates", []), "status": "success"}
        else:
            return {
                "error": f"Error getting templates: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing MulmoCast get templates")
        return {
            "error": f"Error executing MulmoCast get templates: {str(e)}",
            "status": "error"
        }

async def execute_mulmocast_generate_script(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast generate script tool"""
    try:
        template = arguments.get("template")
        topic = arguments.get("topic")
        urls = arguments.get("urls", [])
        interactive = arguments.get("interactive", False)
        
        if not template:
            return {"error": "template is required", "status": "error"}
        if not topic:
            return {"error": "topic is required", "status": "error"}
        
        # Prepare data for MulmoCast scripting API
        data = {
            "template": template,
            "topic": topic,
            "interactive": interactive
        }
        
        if urls:
            data["urls"] = urls
        
        logger.info(f"Generating script with data: {data}")
        
        # Send request to MulmoCast scripting API
        response = requests.post(
            urljoin(MULMOCAST_URL, "/api/scripting"),
            json=data,
            timeout=300  # 5 minutes for script generation
        )
        
        if response.status_code == 200:
            result = response.json()
            script_path = result.get("script_path", "")
            script_content = result.get("script_content", {})
            
            return {
                "script_path": script_path,
                "script_content": script_content,
                "status": "success",
                "message": f"Script generated successfully at {script_path}"
            }
        else:
            return {
                "error": f"Error generating script: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing MulmoCast generate script")
        return {
            "error": f"Error executing MulmoCast generate script: {str(e)}",
            "status": "error"
        }

async def execute_mulmocast_generate_audio(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast generate audio tool"""
    try:
        script_path = arguments.get("script_path")
        force = arguments.get("force", False)
        
        if not script_path:
            return {"error": "script_path is required", "status": "error"}
        
        # Prepare data for MulmoCast audio generation
        data = {
            "script_path": script_path,
            "force": force
        }
        
        logger.info(f"Generating audio with data: {data}")
        
        # Send request to MulmoCast audio generation API
        response = requests.post(
            urljoin(MULMOCAST_URL, "/api/audio"),
            json=data,
            timeout=600  # 10 minutes for audio generation
        )
        
        if response.status_code == 200:
            result = response.json()
            audio_files = result.get("audio_files", [])
            
            # Convert internal URLs to client-accessible URLs
            client_url = os.environ.get("MULMOCAST_CLIENT_URL", "http://localhost:5008")
            audio_urls = []
            for audio_file in audio_files:
                if audio_file.startswith("http"):
                    # Already a full URL, convert to client URL
                    audio_urls.append(audio_file.replace(MULMOCAST_URL, client_url))
                else:
                    # Relative path, create full client URL
                    audio_urls.append(urljoin(client_url, audio_file))
            
            return {
                "audio_files": audio_files,
                "audio_urls": audio_urls,
                "status": "success",
                "message": f"Generated {len(audio_files)} audio files"
            }
        else:
            return {
                "error": f"Error generating audio: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing MulmoCast generate audio")
        return {
            "error": f"Error executing MulmoCast generate audio: {str(e)}",
            "status": "error"
        }

async def execute_mulmocast_generate_images(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast generate images tool"""
    try:
        script_path = arguments.get("script_path")
        force = arguments.get("force", False)
        
        if not script_path:
            return {"error": "script_path is required", "status": "error"}
        
        # Prepare data for MulmoCast image generation
        data = {
            "script_path": script_path,
            "force": force
        }
        
        logger.info(f"Generating images with data: {data}")
        
        # Send request to MulmoCast image generation API
        response = requests.post(
            urljoin(MULMOCAST_URL, "/api/images"),
            json=data,
            timeout=1200  # 20 minutes for image generation
        )
        
        if response.status_code == 200:
            result = response.json()
            image_files = result.get("image_files", [])
            
            # Convert internal URLs to client-accessible URLs
            client_url = os.environ.get("MULMOCAST_CLIENT_URL", "http://localhost:5008")
            image_urls = []
            for image_file in image_files:
                if image_file.startswith("http"):
                    # Already a full URL, convert to client URL
                    image_urls.append(image_file.replace(MULMOCAST_URL, client_url))
                else:
                    # Relative path, create full client URL
                    image_urls.append(urljoin(client_url, image_file))
            
            return {
                "image_files": image_files,
                "image_urls": image_urls,
                "status": "success",
                "message": f"Generated {len(image_files)} image files"
            }
        else:
            return {
                "error": f"Error generating images: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing MulmoCast generate images")
        return {
            "error": f"Error executing MulmoCast generate images: {str(e)}",
            "status": "error"
        }

async def execute_mulmocast_generate_movie(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast generate movie tool"""
    try:
        script_path = arguments.get("script_path")
        force = arguments.get("force", False)
        
        if not script_path:
            return {"error": "script_path is required", "status": "error"}
        
        # Prepare data for MulmoCast movie generation
        data = {
            "script_path": script_path,
            "force": force
        }
        
        logger.info(f"Generating movie with data: {data}")
        
        # Send request to MulmoCast movie generation API
        response = requests.post(
            urljoin(MULMOCAST_URL, "/api/movie"),
            json=data,
            timeout=1800  # 30 minutes for movie generation
        )
        
        if response.status_code == 200:
            result = response.json()
            movie_file = result.get("movie_file", "")
            
            # Convert internal URL to client-accessible URL
            client_url = os.environ.get("MULMOCAST_CLIENT_URL", "http://localhost:5008")
            if movie_file.startswith("http"):
                movie_url = movie_file.replace(MULMOCAST_URL, client_url)
            else:
                movie_url = urljoin(client_url, movie_file)
            
            return {
                "movie_file": movie_file,
                "movie_url": movie_url,
                "status": "success",
                "message": f"Movie generated successfully: {movie_file}"
            }
        else:
            return {
                "error": f"Error generating movie: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
        
    except Exception as e:
        logger.exception("Error executing MulmoCast generate movie")
        return {
            "error": f"Error executing MulmoCast generate movie: {str(e)}",
            "status": "error"
        }

async def execute_mulmocast_create_complete_workflow(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute MulmoCast complete workflow tool"""
    try:
        template = arguments.get("template")
        topic = arguments.get("topic")
        output_formats = arguments.get("output_formats", ["audio"])
        urls = arguments.get("urls", [])
        
        if not template:
            return {"error": "template is required", "status": "error"}
        if not topic:
            return {"error": "topic is required", "status": "error"}
        
        # Step 1: Generate script
        script_result = await execute_mulmocast_generate_script({
            "template": template,
            "topic": topic,
            "urls": urls,
            "interactive": False
        })
        
        if script_result.get("status") != "success":
            return script_result
        
        script_path = script_result.get("script_path")
        if not script_path:
            return {"error": "Failed to get script path from generation", "status": "error"}
        
        # Step 2: Generate requested formats
        results = {
            "script_path": script_path,
            "script_content": script_result.get("script_content", {}),
            "generated_content": {},
            "status": "success"
        }
        
        for format_type in output_formats:
            if format_type == "audio":
                audio_result = await execute_mulmocast_generate_audio({
                    "script_path": script_path,
                    "force": False
                })
                results["generated_content"]["audio"] = audio_result
                
            elif format_type == "images":
                images_result = await execute_mulmocast_generate_images({
                    "script_path": script_path,
                    "force": False
                })
                results["generated_content"]["images"] = images_result
                
            elif format_type == "movie":
                movie_result = await execute_mulmocast_generate_movie({
                    "script_path": script_path,
                    "force": False
                })
                results["generated_content"]["movie"] = movie_result
                
            elif format_type == "pdf":
                # PDF generation would be implemented here if the API supports it
                results["generated_content"]["pdf"] = {
                    "status": "not_implemented",
                    "message": "PDF generation not yet implemented"
                }
        
        return results
        
    except Exception as e:
        logger.exception("Error executing MulmoCast complete workflow")
        return {
            "error": f"Error executing MulmoCast complete workflow: {str(e)}",
            "status": "error"
        }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mulmocast-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "MulmoCast MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp": "JSON-RPC 2.0 endpoint for tool discovery and execution",
            "health": "Health check endpoint"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8507))
    uvicorn.run(app, host="0.0.0.0", port=port)