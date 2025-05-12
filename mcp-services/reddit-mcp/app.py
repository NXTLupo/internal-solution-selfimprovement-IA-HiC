"""
Reddit MCP Service
-----------------
This service wraps the Reddit Ripper tool in a Model Context Protocol (MCP)
compatible interface, allowing the agent to use it for fetching Reddit data.
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
logger = logging.getLogger("reddit-mcp")

# Configuration
REDDIT_RIPPER_URL = os.environ.get("REDDIT_RIPPER_URL", "http://reddit-ripper:5000")

# Models
class ScrapeRequest(BaseModel):
    subreddit: str = Field(..., description="Subreddit name to scrape")
    time_filter: str = Field(
        "week", 
        description="Time filter for posts (hour, day, week, month, year, all)"
    )
    limit: int = Field(25, description="Maximum number of posts to retrieve")
    comments_per_post: int = Field(
        10, 
        description="Maximum number of comments to retrieve per post"
    )
    search_query: Optional[str] = Field(
        None, 
        description="Optional search query to filter posts"
    )

class StatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[float] = None
    message: Optional[str] = None
    files: Optional[List[str]] = None

class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="Reddit MCP Service",
    description="MCP-compatible service for the Reddit Data Collector",
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

# MCP Tools definition
@app.get("/mcp/tools", response_model=List[MCPToolSpec])
async def get_tools():
    """Return the list of available tools in MCP format"""
    # Define available tools
    tools = [
        MCPToolSpec(
            name="reddit.search",
            description="Search for posts in a subreddit with optional filtering",
            parameters={
                "subreddit": {
                    "type": "string",
                    "description": "Subreddit name to search (without 'r/')"
                },
                "query": {
                    "type": "string",
                    "description": "Search query to filter posts"
                },
                "time_filter": {
                    "type": "string",
                    "description": "Time filter (hour, day, week, month, year, all)",
                    "default": "week"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of posts",
                    "default": 25
                },
                "comments_per_post": {
                    "type": "integer",
                    "description": "Maximum comments per post",
                    "default": 10
                }
            },
            returns={
                "job_id": {
                    "type": "string",
                    "description": "Job ID to check status"
                }
            }
        ),
        MCPToolSpec(
            name="reddit.get_status",
            description="Check the status of a Reddit data collection job",
            parameters={
                "job_id": {
                    "type": "string",
                    "description": "Job ID from a previous search request"
                }
            },
            returns={
                "status": {
                    "type": "string",
                    "description": "Job status (pending, running, completed, failed)"
                },
                "progress": {
                    "type": "number",
                    "description": "Progress percentage (0-100)"
                },
                "message": {
                    "type": "string",
                    "description": "Status message or error details"
                },
                "files": {
                    "type": "array",
                    "description": "List of generated files when completed",
                    "items": {
                        "type": "string"
                    }
                }
            }
        ),
        MCPToolSpec(
            name="reddit.get_results",
            description="Get the results of a completed Reddit data collection job",
            parameters={
                "job_id": {
                    "type": "string",
                    "description": "Job ID from a previous search request"
                },
                "include_content": {
                    "type": "boolean",
                    "description": "Whether to include full post content",
                    "default": True
                }
            },
            returns={
                "posts": {
                    "type": "array",
                    "description": "List of posts retrieved",
                    "items": {
                        "type": "object"
                    }
                },
                "pdf_urls": {
                    "type": "array",
                    "description": "URLs to download generated PDFs",
                    "items": {
                        "type": "string"
                    }
                }
            }
        )
    ]
    return tools

@app.post("/mcp/invoke/reddit.search", response_model=Dict[str, Any])
async def invoke_search(
    subreddit: str = Form(...),
    query: Optional[str] = Form(None),
    time_filter: str = Form("week"),
    limit: int = Form(25),
    comments_per_post: int = Form(10)
):
    """MCP endpoint to search Reddit"""
    try:
        # Create scrape request to Reddit Ripper
        scrape_data = {
            "subreddit": subreddit,
            "time_filter": time_filter,
            "limit": limit,
            "comments_per_post": comments_per_post
        }
        
        if query:
            scrape_data["search_query"] = query
            
        # Send request to Reddit Ripper
        response = requests.post(
            urljoin(REDDIT_RIPPER_URL, "/api/scrape"),
            json=scrape_data
        )
        
        if response.status_code != 200:
            logger.error(f"Error from Reddit Ripper: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Reddit Ripper error: {response.text}"
            )
            
        # Parse response
        result = response.json()
        job_id = result.get("job_id")
        
        if not job_id:
            raise HTTPException(
                status_code=500,
                detail="No job ID returned from Reddit Ripper"
            )
            
        # Cache the request for future reference
        job_cache[job_id] = {
            "subreddit": subreddit,
            "query": query,
            "time_filter": time_filter,
            "limit": limit,
            "comments_per_post": comments_per_post
        }
        
        # Return job ID for status checking
        return {"job_id": job_id}
        
    except Exception as e:
        logger.exception("Error invoking Reddit search")
        raise HTTPException(
            status_code=500,
            detail=f"Error invoking Reddit search: {str(e)}"
        )

@app.post("/mcp/invoke/reddit.get_status", response_model=Dict[str, Any])
async def invoke_get_status(job_id: str = Form(...)):
    """MCP endpoint to check job status"""
    try:
        # Send status request to Reddit Ripper
        response = requests.get(
            urljoin(REDDIT_RIPPER_URL, f"/api/status/{job_id}")
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting job status: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting job status: {response.text}"
            )
            
        # Parse response
        result = response.json()
        
        # Extract relevant information
        status_info = {
            "status": result.get("status", "unknown"),
            "progress": result.get("progress", 0),
            "message": result.get("message", ""),
            "files": result.get("files", [])
        }
        
        return status_info
        
    except Exception as e:
        logger.exception("Error getting job status")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting job status: {str(e)}"
        )

@app.post("/mcp/invoke/reddit.get_results", response_model=Dict[str, Any])
async def invoke_get_results(
    job_id: str = Form(...),
    include_content: bool = Form(True)
):
    """MCP endpoint to get job results"""
    try:
        # First check status to ensure job is completed
        status_response = requests.get(
            urljoin(REDDIT_RIPPER_URL, f"/api/status/{job_id}")
        )

        status_data = status_response.json()

        if status_data.get("status") != "completed":
            return {
                "error": "Job not completed yet",
                "status": status_data.get("status", "unknown"),
                "progress": status_data.get("progress", 0)
            }

        # Get the list of files
        files = status_data.get("files", [])

        # Prepare PDF URLs - converting internal URLs to external ones
        pdf_urls = []
        for file in files:
            # Create internal URL for reference
            internal_pdf_url = urljoin(REDDIT_RIPPER_URL, f"/api/download/{job_id}/{file}")

            # Get external client URL from environment or use default
            reddit_ripper_client_url = os.environ.get(
                "REDDIT_RIPPER_CLIENT_URL",
                "http://localhost:5001"  # Default external port for reddit-ripper
            )

            # Create external URL by replacing the internal host:port with external one
            external_pdf_url = urljoin(reddit_ripper_client_url, f"/api/download/{job_id}/{file}")

            # Log both URLs for debugging
            logger.info(f"Converting PDF URL from internal {internal_pdf_url} to external {external_pdf_url}")

            # Add the external URL to the list
            pdf_urls.append(external_pdf_url)

        # If we don't need content, just return the PDF URLs
        if not include_content:
            return {
                "posts": [],
                "pdf_urls": pdf_urls
            }

        # For include_content, we need to parse PDFs or use another API
        # This is a simplified version - in a real implementation, we'd extract
        # the actual content from the generated PDFs or get it directly from
        # the Reddit Ripper's database

        # Placeholder for posts
        posts = [
            {"title": f"Post from {job_id}", "content": "This is a sample post content"}
        ]

        return {
            "posts": posts,
            "pdf_urls": pdf_urls
        }
        
    except Exception as e:
        logger.exception("Error getting job results")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting job results: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "reddit-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Reddit MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp/tools": "Get available tools",
            "mcp/invoke/reddit.search": "Search Reddit",
            "mcp/invoke/reddit.get_status": "Check job status",
            "mcp/invoke/reddit.get_results": "Get job results"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)