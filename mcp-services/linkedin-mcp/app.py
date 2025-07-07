"""
LinkedIn Generator MCP Service - JSON-RPC 2.0 Compliant
------------------------------------------------------
This service wraps the LinkedIn Post Generator tool in a Model Context Protocol (MCP)
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
logger = logging.getLogger("linkedin-mcp")

# Configuration
LINKEDIN_GENERATOR_URL = os.environ.get("LINKEDIN_GENERATOR_URL", "http://linkedin-generator:5000")

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

# Create FastAPI app
app = FastAPI(
    title="LinkedIn Generator MCP Service",
    description="MCP-compatible service for the LinkedIn Post Generator",
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
                    "name": "linkedin_generate_post",
                    "description": "Generate professional LinkedIn posts using Extended Thinking analysis",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "Input content to analyze and create LinkedIn post from"
                            },
                            "post_type": {
                                "type": "string",
                                "description": "Type of LinkedIn post (professional, thought_leadership, industry_insight)",
                                "default": "professional"
                            },
                            "tone": {
                                "type": "string",
                                "description": "Tone of the post (professional, casual, inspirational)",
                                "default": "professional"
                            },
                            "include_hashtags": {
                                "type": "boolean",
                                "description": "Whether to include relevant hashtags",
                                "default": True
                            },
                            "include_call_to_action": {
                                "type": "boolean",
                                "description": "Whether to include a call to action",
                                "default": True
                            }
                        },
                        "required": ["content"]
                    }
                },
                {
                    "name": "linkedin_get_status",
                    "description": "Check the status of a LinkedIn post generation job",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "job_id": {
                                "type": "string",
                                "description": "Job ID from a previous generation request"
                            }
                        },
                        "required": ["job_id"]
                    }
                },
                {
                    "name": "linkedin_get_results",
                    "description": "Get the results of a completed LinkedIn post generation job",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "job_id": {
                                "type": "string",
                                "description": "Job ID from a previous generation request"
                            }
                        },
                        "required": ["job_id"]
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
            
            if tool_name == "linkedin_generate_post":
                result = await execute_linkedin_generate_post(arguments)
            elif tool_name == "linkedin_get_status":
                result = await execute_linkedin_get_status(arguments)
            elif tool_name == "linkedin_get_results":
                result = await execute_linkedin_get_results(arguments)
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
async def execute_linkedin_generate_post(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute LinkedIn post generation tool"""
    try:
        content = arguments.get("content")
        post_type = arguments.get("post_type", "professional")
        tone = arguments.get("tone", "professional")
        include_hashtags = arguments.get("include_hashtags", True)
        include_call_to_action = arguments.get("include_call_to_action", True)
        
        # Create request data for LinkedIn Generator
        request_data = {
            "content": content,
            "post_type": post_type,
            "tone": tone,
            "include_hashtags": include_hashtags,
            "include_call_to_action": include_call_to_action
        }
        
        # Send request to LinkedIn Generator
        response = requests.post(
            urljoin(LINKEDIN_GENERATOR_URL, "/api/generate"),
            json=request_data,
            timeout=60
        )
        
        if response.status_code != 200:
            logger.error(f"Error from LinkedIn Generator: {response.text}")
            return {
                "error": f"LinkedIn Generator error: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
            
        # Parse response
        result = response.json()
        job_id = result.get("job_id")
        
        if not job_id:
            return {
                "error": "No job ID returned from LinkedIn Generator",
                "status": "error"
            }
            
        # Cache the request for future reference
        job_cache[job_id] = {
            "content": content,
            "post_type": post_type,
            "tone": tone,
            "include_hashtags": include_hashtags,
            "include_call_to_action": include_call_to_action
        }
        
        return {"job_id": job_id, "status": "success"}
        
    except Exception as e:
        logger.exception("Error executing LinkedIn post generation")
        return {
            "error": f"Error executing LinkedIn post generation: {str(e)}",
            "status": "error"
        }

async def execute_linkedin_get_status(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute LinkedIn get status tool"""
    try:
        job_id = arguments.get("job_id")
        
        # Send status request to LinkedIn Generator
        response = requests.get(
            urljoin(LINKEDIN_GENERATOR_URL, f"/api/status/{job_id}"),
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting job status: {response.text}")
            return {
                "error": f"Error getting job status: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
            
        # Parse response
        result = response.json()
        
        # Extract relevant information
        return {
            "status": result.get("status", "unknown"),
            "progress": result.get("progress", 0),
            "message": result.get("message", ""),
            "estimated_time": result.get("estimated_time", "")
        }
        
    except Exception as e:
        logger.exception("Error getting job status")
        return {
            "error": f"Error getting job status: {str(e)}",
            "status": "error"
        }

async def execute_linkedin_get_results(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute LinkedIn get results tool"""
    try:
        job_id = arguments.get("job_id")
        
        # First check status to ensure job is completed
        status_response = requests.get(
            urljoin(LINKEDIN_GENERATOR_URL, f"/api/status/{job_id}"),
            timeout=30
        )

        status_data = status_response.json()

        if status_data.get("status") != "completed":
            return {
                "error": "Job not completed yet",
                "status": status_data.get("status", "unknown"),
                "progress": status_data.get("progress", 0)
            }

        # Get the results
        response = requests.get(
            urljoin(LINKEDIN_GENERATOR_URL, f"/api/results/{job_id}"),
            timeout=30
        )

        if response.status_code != 200:
            logger.error(f"Error getting job results: {response.text}")
            return {
                "error": f"Error getting job results: {response.text}",
                "status": "error",
                "status_code": response.status_code
            }

        result = response.json()

        return {
            "linkedin_post": result.get("linkedin_post", ""),
            "extended_thinking_analysis": result.get("extended_thinking_analysis", {}),
            "hashtags": result.get("hashtags", []),
            "engagement_tips": result.get("engagement_tips", []),
            "status": "success"
        }
        
    except Exception as e:
        logger.exception("Error getting job results")
        return {
            "error": f"Error getting job results: {str(e)}",
            "status": "error"
        }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "linkedin-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "LinkedIn Generator MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp": "JSON-RPC 2.0 endpoint for tool discovery and execution",
            "health": "Health check endpoint"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8508))
    uvicorn.run(app, host="0.0.0.0", port=port)