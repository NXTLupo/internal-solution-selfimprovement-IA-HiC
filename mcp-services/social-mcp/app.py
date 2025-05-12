"""
Social Research MCP Service
--------------------------
This service wraps the Social Research tool in a Model Context Protocol (MCP)
compatible interface, allowing the agent to use it for analyzing social media data.
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
logger = logging.getLogger("social-mcp")

# Configuration
SOCIAL_RESEARCH_BACKEND_URL = os.environ.get("SOCIAL_RESEARCH_BACKEND_URL", "http://social-research-backend:8081")

# Models
class TopicModelRequest(BaseModel):
    data_source: str = Field(..., description="Source of data (e.g., 'reddit', 'twitter')")
    input_files: List[str] = Field([], description="List of input file IDs or paths")
    num_topics: Optional[int] = Field(None, description="Number of topics to identify")
    topic_terms: Optional[int] = Field(None, description="Number of terms per topic")

class SentimentRequest(BaseModel):
    search_id: str = Field(..., description="ID of search results to analyze")
    sentiment_type: str = Field("roberta", description="Sentiment analysis algorithm to use")

class TopicModelResponse(BaseModel):
    job_id: str
    status: str

class MCPToolSpec(BaseModel):
    """MCP Tool specification"""
    name: str
    description: str
    parameters: Dict[str, Any]
    returns: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="Social Research MCP Service",
    description="MCP-compatible service for the Social Research Tool",
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
    tools = [
        MCPToolSpec(
            name="social.topic_model",
            description="Perform topic modeling on social media data",
            parameters={
                "data_source": {
                    "type": "string", 
                    "description": "Source of data (e.g., 'reddit', 'twitter')"
                },
                "search_query": {
                    "type": "string",
                    "description": "Query to search for in the dataset"
                },
                "num_topics": {
                    "type": "integer",
                    "description": "Number of topics to identify (default: auto)",
                    "default": 0
                },
                "topic_terms": {
                    "type": "integer",
                    "description": "Number of terms per topic",
                    "default": 10
                }
            },
            returns={
                "job_id": {
                    "type": "string",
                    "description": "Job ID for tracking status"
                }
            }
        ),
        MCPToolSpec(
            name="social.get_topic_status",
            description="Check the status of a topic modeling job",
            parameters={
                "job_id": {
                    "type": "string",
                    "description": "Job ID from a previous topic modeling request"
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
                }
            }
        ),
        MCPToolSpec(
            name="social.get_topic_results",
            description="Get the results of a completed topic modeling job",
            parameters={
                "job_id": {
                    "type": "string",
                    "description": "Job ID from a previous topic modeling request"
                }
            },
            returns={
                "topics": {
                    "type": "array",
                    "description": "List of identified topics",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "name": {"type": "string"},
                            "keywords": {"type": "array"},
                            "score": {"type": "number"}
                        }
                    }
                },
                "visualization_url": {
                    "type": "string",
                    "description": "URL to access the topic visualization"
                }
            }
        ),
        MCPToolSpec(
            name="social.sentiment_analysis",
            description="Perform sentiment analysis on social media data",
            parameters={
                "search_query": {
                    "type": "string",
                    "description": "Query to analyze sentiment for"
                },
                "data_source": {
                    "type": "string",
                    "description": "Source of data (e.g., 'reddit', 'twitter')"
                },
                "sentiment_type": {
                    "type": "string",
                    "description": "Sentiment analysis algorithm to use",
                    "default": "roberta"
                }
            },
            returns={
                "job_id": {
                    "type": "string",
                    "description": "Job ID for tracking sentiment analysis"
                }
            }
        ),
        MCPToolSpec(
            name="social.get_sentiment_results",
            description="Get the results of a completed sentiment analysis job",
            parameters={
                "job_id": {
                    "type": "string",
                    "description": "Job ID from a previous sentiment analysis request"
                }
            },
            returns={
                "sentiment": {
                    "type": "object",
                    "description": "Overall sentiment analysis results",
                    "properties": {
                        "positive_aspects": {"type": "array"},
                        "negative_aspects": {"type": "array"},
                        "neutral_aspects": {"type": "array"},
                        "overall_score": {"type": "number"}
                    }
                },
                "visualization_url": {
                    "type": "string",
                    "description": "URL to access the sentiment visualization"
                }
            }
        ),
        MCPToolSpec(
            name="social.search",
            description="Search for posts in the social research database",
            parameters={
                "query": {
                    "type": "string",
                    "description": "Search query"
                },
                "data_source": {
                    "type": "string",
                    "description": "Source of data (e.g., 'reddit', 'twitter')"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of results",
                    "default": 20
                }
            },
            returns={
                "search_id": {
                    "type": "string",
                    "description": "ID for reference in other calls"
                },
                "results": {
                    "type": "array",
                    "description": "List of search results",
                    "items": {
                        "type": "object"
                    }
                }
            }
        )
    ]
    return tools

@app.post("/mcp/invoke/social.topic_model", response_model=Dict[str, Any])
async def invoke_topic_model(
    data_source: str = Form(...),
    search_query: str = Form(...),
    num_topics: int = Form(0),
    topic_terms: int = Form(10)
):
    """MCP endpoint to perform topic modeling"""
    try:
        # Create request to Social Research backend
        payload = {
            "data_source": data_source,
            "search_query": search_query,
            "params": {
                "num_topics": num_topics if num_topics > 0 else None,
                "topic_terms": topic_terms
            }
        }
        
        # Send request to Social Research backend
        response = requests.post(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, "/api/topic-model/analyze-async"),
            json=payload
        )
        
        if response.status_code != 200:
            logger.error(f"Error from Social Research: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Social Research error: {response.text}"
            )
            
        # Parse response
        result = response.json()
        job_id = result.get("job_id")
        
        if not job_id:
            raise HTTPException(
                status_code=500,
                detail="No job ID returned from Social Research"
            )
            
        # Cache the request for future reference
        job_cache[job_id] = {
            "type": "topic_model",
            "data_source": data_source,
            "search_query": search_query,
            "num_topics": num_topics,
            "topic_terms": topic_terms
        }
        
        # Return job ID for status checking
        return {"job_id": job_id}
        
    except Exception as e:
        logger.exception("Error invoking topic modeling")
        raise HTTPException(
            status_code=500,
            detail=f"Error invoking topic modeling: {str(e)}"
        )

@app.post("/mcp/invoke/social.get_topic_status", response_model=Dict[str, Any])
async def invoke_get_topic_status(job_id: str = Form(...)):
    """MCP endpoint to check topic modeling job status"""
    try:
        # Send status request to Social Research backend
        response = requests.get(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, f"/api/topic-model/jobs/{job_id}")
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
            "message": result.get("message", "")
        }
        
        return status_info
        
    except Exception as e:
        logger.exception("Error getting topic modeling status")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting topic modeling status: {str(e)}"
        )

@app.post("/mcp/invoke/social.get_topic_results", response_model=Dict[str, Any])
async def invoke_get_topic_results(job_id: str = Form(...)):
    """MCP endpoint to get topic modeling results"""
    try:
        # Send results request to Social Research backend
        response = requests.get(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, f"/api/topic-model/results/{job_id}")
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting topic results: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting topic results: {response.text}"
            )
            
        # Parse response
        result = response.json()
        
        # Prepare the visualization URL (frontend URL to display the results)
        visualization_url = os.environ.get(
            "SOCIAL_RESEARCH_FRONTEND_URL", 
            "http://localhost:3000"
        )
        visualization_url = f"{visualization_url}/topics/{job_id}"
        
        # Process the topic data
        topics = result.get("topics", [])
        processed_topics = []
        
        for topic in topics:
            processed_topics.append({
                "id": topic.get("id"),
                "name": topic.get("name", f"Topic {topic.get('id')}"),
                "keywords": topic.get("keywords", []),
                "score": topic.get("score", 0),
                "document_count": topic.get("document_count", 0)
            })
            
        return {
            "topics": processed_topics,
            "visualization_url": visualization_url
        }
        
    except Exception as e:
        logger.exception("Error getting topic results")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting topic results: {str(e)}"
        )

@app.post("/mcp/invoke/social.sentiment_analysis", response_model=Dict[str, Any])
async def invoke_sentiment_analysis(
    search_query: str = Form(...),
    data_source: str = Form(...),
    sentiment_type: str = Form("roberta")
):
    """MCP endpoint to perform sentiment analysis"""
    try:
        # First, perform a search to get search_id
        search_payload = {
            "query": search_query,
            "data_source": data_source,
            "limit": 100  # Get a good sample for sentiment analysis
        }
        
        search_response = requests.post(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, "/api/llm-analyzer/search"),
            json=search_payload
        )
        
        if search_response.status_code != 200:
            logger.error(f"Error performing search: {search_response.text}")
            raise HTTPException(
                status_code=search_response.status_code,
                detail=f"Error performing search: {search_response.text}"
            )
            
        search_result = search_response.json()
        search_id = search_result.get("search_id")
        
        if not search_id:
            raise HTTPException(
                status_code=500,
                detail="No search ID returned from Social Research"
            )
            
        # Now, perform sentiment analysis on the search results
        sentiment_payload = {
            "sentiment_type": sentiment_type
        }
        
        sentiment_response = requests.post(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, f"/api/llm-analyzer/analyze-sentiment/{search_id}"),
            json=sentiment_payload
        )
        
        if sentiment_response.status_code != 200:
            logger.error(f"Error performing sentiment analysis: {sentiment_response.text}")
            raise HTTPException(
                status_code=sentiment_response.status_code,
                detail=f"Error performing sentiment analysis: {sentiment_response.text}"
            )
            
        sentiment_result = sentiment_response.json()
        job_id = sentiment_result.get("job_id")
        
        if not job_id:
            raise HTTPException(
                status_code=500,
                detail="No job ID returned from sentiment analysis"
            )
            
        # Cache the request for future reference
        job_cache[job_id] = {
            "type": "sentiment",
            "search_query": search_query,
            "data_source": data_source,
            "sentiment_type": sentiment_type,
            "search_id": search_id
        }
        
        # Return job ID for status checking
        return {"job_id": job_id}
        
    except Exception as e:
        logger.exception("Error invoking sentiment analysis")
        raise HTTPException(
            status_code=500,
            detail=f"Error invoking sentiment analysis: {str(e)}"
        )

@app.post("/mcp/invoke/social.get_sentiment_results", response_model=Dict[str, Any])
async def invoke_get_sentiment_results(job_id: str = Form(...)):
    """MCP endpoint to get sentiment analysis results"""
    try:
        # Need to identify the search_id from our cache
        job_info = job_cache.get(job_id, {})
        search_id = job_info.get("search_id")
        
        if not search_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid job ID or missing search_id in cache"
            )
            
        # Send results request to Social Research backend
        response = requests.get(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, f"/api/llm-analyzer/sentiment-results/{search_id}")
        )
        
        if response.status_code != 200:
            logger.error(f"Error getting sentiment results: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error getting sentiment results: {response.text}"
            )
            
        # Parse response
        result = response.json()
        
        # Prepare the visualization URL
        visualization_url = os.environ.get(
            "SOCIAL_RESEARCH_FRONTEND_URL", 
            "http://localhost:3000"
        )
        visualization_url = f"{visualization_url}/sentiment/{search_id}"
        
        # Process the sentiment data
        sentiment_data = result.get("sentiment", {})
        
        return {
            "sentiment": {
                "positive_aspects": sentiment_data.get("positive_aspects", []),
                "negative_aspects": sentiment_data.get("negative_aspects", []),
                "neutral_aspects": sentiment_data.get("neutral_aspects", []),
                "overall_score": sentiment_data.get("overall_score", 0)
            },
            "visualization_url": visualization_url
        }
        
    except Exception as e:
        logger.exception("Error getting sentiment results")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting sentiment results: {str(e)}"
        )

@app.post("/mcp/invoke/social.search", response_model=Dict[str, Any])
async def invoke_search(
    query: str = Form(...),
    data_source: str = Form(...),
    limit: int = Form(20)
):
    """MCP endpoint to search social data"""
    try:
        # Create search request
        payload = {
            "query": query,
            "data_source": data_source,
            "limit": limit
        }
        
        # Send request to Social Research backend
        response = requests.post(
            urljoin(SOCIAL_RESEARCH_BACKEND_URL, "/api/llm-analyzer/search"),
            json=payload
        )
        
        if response.status_code != 200:
            logger.error(f"Error performing search: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error performing search: {response.text}"
            )
            
        # Parse response
        result = response.json()
        search_id = result.get("search_id")
        results = result.get("results", [])
        
        if not search_id:
            raise HTTPException(
                status_code=500,
                detail="No search ID returned from Social Research"
            )
            
        # Process the results to make them more concise
        processed_results = []
        for item in results:
            processed_results.append({
                "id": item.get("id"),
                "title": item.get("title", ""),
                "text": item.get("text", "")[:200] + "..." if len(item.get("text", "")) > 200 else item.get("text", ""),
                "source": item.get("source", ""),
                "created_at": item.get("created_at", ""),
                "score": item.get("score", 0)
            })
            
        return {
            "search_id": search_id,
            "results": processed_results,
            "total_count": len(results)
        }
        
    except Exception as e:
        logger.exception("Error performing search")
        raise HTTPException(
            status_code=500,
            detail=f"Error performing search: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "social-mcp"}

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Social Research MCP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "mcp/tools": "Get available tools",
            "mcp/invoke/social.topic_model": "Perform topic modeling",
            "mcp/invoke/social.get_topic_status": "Check topic modeling status",
            "mcp/invoke/social.get_topic_results": "Get topic modeling results",
            "mcp/invoke/social.sentiment_analysis": "Perform sentiment analysis",
            "mcp/invoke/social.get_sentiment_results": "Get sentiment analysis results",
            "mcp/invoke/social.search": "Search social data"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)