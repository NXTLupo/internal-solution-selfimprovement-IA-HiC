# Technical Architecture for MCP Integration

## Overview

This document outlines the technical architecture for integrating a Model Context Protocol (MCP) enabled conversational agent with the NXT HUMANS CX WORKBENCH. The architecture follows MCP best practices to create a unified, multimodal interface that can seamlessly control all workbench tools.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      User Interface Layer                           │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │  Chat Interface │   │ File Uploader   │   │ Visualizations  │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Conversational Agent Layer                        │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │  Claude 3.7     │   │  Context        │   │  Rule Engine    │   │
│  │  Sonnet         │   │  Manager        │   │                 │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MCP Client Layer                              │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ MCP Client      │   │ Tool Registry   │   │ Tool Selection  │   │
│  │ Manager         │   │                 │   │ Logic           │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MCP Server Layer                              │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Launchpad       │   │ Reddit Data     │   │ Social Research │   │
│  │ MCP Server      │   │ Collector MCP   │   │ Tool MCP Server │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐                         │
│  │ Journey Mapper  │   │ Shared Storage  │                         │
│  │ MCP Server      │   │ MCP Server      │                         │
│  └─────────────────┘   └─────────────────┘                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Workbench Application Layer                     │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Launchpad       │   │ Reddit Data     │   │ Social Research │   │
│  │ Application     │   │ Collector       │   │ Tool            │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                     │
│  ┌─────────────────┐                                                │
│  │ Journey Mapper  │                                                │
│  │ Application     │                                                │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. User Interface Layer

The user interface layer provides the frontend experience for users to interact with the conversational agent.

#### Components:
- **Chat Interface**: Handles text input/output with message history
- **File Uploader**: Manages document and image uploads 
- **Visualizations**: Displays charts, journey maps, and other visual outputs

#### Technologies:
- React with TypeScript
- Material UI components
- D3.js for visualizations
- WebSockets for real-time updates

### 2. Conversational Agent Layer

The conversational agent layer manages the core AI interaction and conversation logic.

#### Components:
- **Claude 3.7 Sonnet**: Core LLM for understanding and generating responses
- **Context Manager**: Maintains conversation history and state
- **Rule Engine**: Implements rule-based conversation flows for each tool

#### Technologies:
- Anthropic Claude 3.7 Sonnet API
- Custom rule engine implementation
- Vector database for context storage (PostgreSQL with pgvector)

### 3. MCP Client Layer

The MCP client layer handles communication with the various MCP servers representing each workbench tool.

#### Components:
- **MCP Client Manager**: Manages connections to all MCP servers
- **Tool Registry**: Maintains registry of available tools and capabilities
- **Tool Selection Logic**: Determines which tools to use for specific requests

#### Technologies:
- MCP TypeScript/Python SDK
- Tool metadata registry
- Dynamic tool discovery

### 4. MCP Server Layer

The MCP server layer provides standardized interfaces to each component of the workbench.

#### Components:
- **Launchpad MCP Server**: Provides navigation and status capabilities
- **Reddit Data Collector MCP Server**: Exposes data collection functions
- **Social Research Tool MCP Server**: Provides analysis capabilities
- **Journey Mapper MCP Server**: Offers journey mapping functions
- **Shared Storage MCP Server**: Manages file exchange between tools

#### Technologies:
- MCP Server SDK (Python)
- Docker containers for isolation
- RESTful API integration with existing tools
- PostgreSQL for persistent storage

### 5. Workbench Application Layer

The existing NXT HUMANS CX WORKBENCH applications that provide the core functionality.

#### Components:
- **Launchpad Application**: Central dashboard for workbench
- **Reddit Data Collector**: For gathering social data
- **Social Research Tool**: For analytics and insights
- **Journey Mapper**: For creating customer journey maps

## Data Flow

### Conversation Initiation Flow

1. User enters text or uploads a file through the User Interface
2. Chat Interface forwards input to Conversational Agent
3. Claude 3.7 Sonnet processes input with context from Context Manager
4. Rule Engine applies appropriate rules based on user intent
5. MCP Client Manager identifies required tools
6. Request is routed to appropriate MCP Server(s)
7. MCP Server executes operations on Workbench Application
8. Results flow back through the same path
9. Response is presented to user through Chat Interface

### File Processing Flow

1. User uploads file through File Uploader
2. File is stored in temporary storage
3. Conversational Agent is notified of file upload
4. MCP Client Manager routes file to appropriate MCP Server
5. MCP Server processes file using Workbench Application
6. Results are stored in Shared Storage
7. MCP Client Manager retrieves results
8. Conversational Agent formulates response
9. Response with file processing results is displayed to user

### Cross-Tool Workflow Flow

1. User requests multi-step workflow (e.g., Reddit collection → Analysis → Journey Mapping)
2. Conversational Agent identifies workflow pattern
3. Rule Engine applies workflow-specific rules
4. MCP Client Manager coordinates sequential tool usage
5. First tool (Reddit Data Collector) executes via MCP Server
6. Results are stored in Shared Storage
7. Second tool (Social Research Tool) processes results
8. New results are stored in Shared Storage
9. Third tool (Journey Mapper) creates final output
10. Complete workflow results are presented to user

## Technical Implementation Details

### MCP Server Implementation

Each MCP server will follow this structure:

```python
from mcp.server import MCPServer
from mcp.tool import Tool, Parameter

# Create MCP server for Reddit Data Collector
reddit_server = MCPServer(
    name="reddit_data_collector",
    description="Collects posts and comments from Reddit subreddits"
)

# Define tool for collecting Reddit data
collect_reddit_data = Tool(
    name="collect_reddit_data",
    description="Collects posts and comments from a subreddit",
    parameters=[
        Parameter(name="subreddit", description="Name of subreddit to collect from", type="string"),
        Parameter(name="post_count", description="Number of posts to collect", type="integer"),
        Parameter(name="time_filter", description="Time filter for posts", type="string", 
                 enum=["day", "week", "month", "year", "all"]),
        Parameter(name="comments_per_post", description="Number of comments per post", type="integer")
    ]
)

# Implement tool function
@collect_reddit_data.function
async def collect_reddit_data_func(subreddit, post_count, time_filter, comments_per_post):
    # Implement Reddit collection logic
    job_id = start_collection_job(subreddit, post_count, time_filter, comments_per_post)
    return {"job_id": job_id, "status": "started"}

# Register tool with server
reddit_server.register_tool(collect_reddit_data)

# Run server
if __name__ == "__main__":
    reddit_server.run(host="0.0.0.0", port=8001)
```

### Conversational Agent Implementation

The conversational agent will use Claude 3.7 Sonnet with a carefully crafted system prompt:

```python
import anthropic
from mcp.client import MCPClient

# Initialize Claude client
claude_client = anthropic.Client(api_key="your_api_key")

# Initialize MCP clients
reddit_client = MCPClient(url="http://reddit_server:8001")
social_client = MCPClient(url="http://social_research_server:8002")
journey_client = MCPClient(url="http://journey_mapper_server:8003")

# Create system prompt with rules
system_prompt = """
You are an AI assistant that helps users with the NXT HUMANS CX WORKBENCH.
This workbench has three main tools:
1. Reddit Data Collector - for gathering social media data
2. Social Research Analysis Tool - for analyzing data and extracting insights
3. AI Journey Mapper - for creating customer journey maps

Follow these rules when interacting with users:
[Include comprehensive rules from the rule sets]

You have access to these tools via MCP:
[Tool descriptions automatically populated from MCP clients]
"""

# Function to process user input
async def process_user_input(user_input, conversation_context):
    # Update context with user input
    conversation_context.append({"role": "user", "content": user_input})
    
    # Get tools from MCP clients
    available_tools = {
        **reddit_client.get_tools(),
        **social_client.get_tools(),
        **journey_client.get_tools()
    }
    
    # Generate Claude response
    response = claude_client.messages.create(
        model="claude-3-7-sonnet-20250219",
        system=system_prompt,
        messages=conversation_context,
        tools=available_tools
    )
    
    # Process tool calls if present
    if response.tool_calls:
        for tool_call in response.tool_calls:
            tool_name = tool_call.name
            tool_args = tool_call.parameters
            
            # Route to appropriate MCP client
            if tool_name.startswith("reddit_"):
                tool_result = await reddit_client.call_tool(tool_name, tool_args)
            elif tool_name.startswith("social_"):
                tool_result = await social_client.call_tool(tool_name, tool_args)
            elif tool_name.startswith("journey_"):
                tool_result = await journey_client.call_tool(tool_name, tool_args)
            
            # Add tool result to context
            conversation_context.append({
                "role": "tool",
                "tool_name": tool_name,
                "content": tool_result
            })
        
        # Generate final response with tool results
        final_response = claude_client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=system_prompt,
            messages=conversation_context
        )
        
        conversation_context.append({"role": "assistant", "content": final_response.content})
        return final_response.content
    
    # If no tool calls, just return the response
    conversation_context.append({"role": "assistant", "content": response.content})
    return response.content
```

### File Handling Implementation

For handling file uploads and transfers between tools:

```python
from mcp.server import MCPServer
from mcp.tool import Tool, Parameter
import mimetypes

# Create MCP server for shared storage
storage_server = MCPServer(
    name="shared_storage",
    description="Manages file transfers between workbench tools"
)

# Define tool for file uploads
upload_file = Tool(
    name="upload_file",
    description="Uploads a file to shared storage",
    parameters=[
        Parameter(name="file_content", description="Base64 encoded file content", type="string"),
        Parameter(name="file_name", description="Name of the file", type="string"),
        Parameter(name="mime_type", description="MIME type of the file", type="string")
    ]
)

# Implement file upload function
@upload_file.function
async def upload_file_func(file_content, file_name, mime_type):
    # Decode and store file
    file_id = store_file(file_content, file_name, mime_type)
    
    # Determine file type and route accordingly
    if mime_type == "application/pdf":
        # Queue for PDF processing
        queue_pdf_processing(file_id)
    elif mime_type in ["text/csv", "application/json"]:
        # Queue for data processing
        queue_data_processing(file_id)
    
    return {
        "file_id": file_id,
        "status": "uploaded",
        "processing_status": "queued"
    }

# Register tool with server
storage_server.register_tool(upload_file)

# Run server
if __name__ == "__main__":
    storage_server.run(host="0.0.0.0", port=8004)
```

# Comprehensive MCP Server Implementations for NXT HUMANS CX Workbench

This document provides complete implementations for all MCP servers needed to fix the integration issues in the NXT HUMANS CX Workbench.

## 1. Reddit Data Collector MCP Server Implementation

```python
# reddit-mcp/server.py
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.tools import Tool, Parameters
import requests
import os
import json
import time
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Reddit Data Collector URL
REDDIT_COLLECTOR_URL = os.environ.get("REDDIT_COLLECTOR_URL", "http://reddit-ripper:5000")

# Initialize MCP server
reddit_server = FastMCP("Reddit Data Collector")

# Active collection jobs
jobs = {}

@reddit_server.tool(
    "reddit_collect_data",
    {
        "subreddit": Parameters.String(description="Name of subreddit"),
        "post_count": Parameters.Integer(description="Number of posts to collect", default=100),
        "time_filter": Parameters.String(
            description="Time filter",
            enum=["day", "week", "month", "year", "all"],
            default="month"
        ),
        "comments_per_post": Parameters.Integer(description="Number of comments per post", default=30)
    }
)
async def reddit_collect_data(subreddit, post_count=100, time_filter="month", comments_per_post=30):
    """Collect posts and comments from a Reddit subreddit"""
    try:
        logger.info(f"Starting collection for r/{subreddit} with {post_count} posts and {comments_per_post} comments per post")
        
        # Parameter validation
        if not subreddit:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Subreddit name is required."
                }]
            }
        
        if post_count > 500:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Maximum post count is 500. Please reduce the number of posts."
                }]
            }
        
        if comments_per_post > 100:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Maximum comments per post is 100."
                }]
            }
        
        # Map to the actual Reddit Data Collector API
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job in our tracking system
        jobs[job_id] = {
            "status": "initializing",
            "progress": 0,
            "subreddit": subreddit,
            "post_count": post_count,
            "time_filter": time_filter,
            "comments_per_post": comments_per_post,
            "start_time": time.time(),
            "output_file": None
        }
        
        # Map our parameters to what the Reddit Data Collector expects
        # The actual Reddit Data Collector API might have different parameter names
        api_params = {
            "subreddit": subreddit,
            "post_count": post_count,
            "time_filter": time_filter,
            "comments_per_post": comments_per_post
        }
        
        # Call the Reddit Data Collector API to start the job
        # Using the actual API endpoint structure of the Reddit Ripper
        response = requests.post(
            f"{REDDIT_COLLECTOR_URL}/api/scrape",
            json=api_params
        )
        
        if response.status_code != 200:
            logger.error(f"Error from Reddit Data Collector: {response.text}")
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = f"API error: {response.text}"
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error starting Reddit data collection: API returned status {response.status_code}"
                }]
            }
        
        # Get the actual job ID from the response
        result = response.json()
        reddit_job_id = result.get("job_id", "unknown")
        
        # Update our job tracking with the actual job ID from Reddit Ripper
        jobs[job_id]["reddit_job_id"] = reddit_job_id
        jobs[job_id]["status"] = "running"
        
        return {
            "content": [{
                "type": "text",
                "text": f"Started collection job for r/{subreddit} with {post_count} posts and {comments_per_post} comments per post. Job ID: {job_id}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in reddit_collect_data: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error collecting Reddit data: {str(e)}"
            }]
        }

@reddit_server.tool(
    "reddit_get_job_status",
    {
        "job_id": Parameters.String(description="Job ID to check")
    }
)
async def reddit_get_job_status(job_id):
    """Check the status of a Reddit collection job"""
    try:
        if job_id not in jobs:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = jobs[job_id]
        
        # If we have the actual Reddit Ripper job ID, check its status
        if "reddit_job_id" in job and job["status"] == "running":
            reddit_job_id = job["reddit_job_id"]
            
            # Call the actual status endpoint of the Reddit Ripper
            response = requests.get(
                f"{REDDIT_COLLECTOR_URL}/api/status/{reddit_job_id}"
            )
            
            if response.status_code != 200:
                logger.error(f"Error checking job status with Reddit Data Collector: {response.text}")
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Error checking job status: API returned status {response.status_code}"
                    }]
                }
            
            # Parse the status response
            status_result = response.json()
            actual_status = status_result.get("status", "unknown")
            actual_progress = status_result.get("progress", 0)
            
            # Update our job tracking
            job["status"] = actual_status
            job["progress"] = actual_progress
            
            if actual_status == "completed":
                # Get output file information
                job["output_file"] = status_result.get("output_file")
                job["end_time"] = time.time()
                
                # Store file in shared location if it's not already there
                if job["output_file"] and not job["output_file"].startswith("/shared/"):
                    # Copy file to shared location
                    original_file = job["output_file"]
                    shared_file = f"/shared/reddit_{job['subreddit']}_{int(time.time())}.pdf"
                    
                    try:
                        with open(original_file, 'rb') as src, open(shared_file, 'wb') as dst:
                            dst.write(src.read())
                        job["output_file"] = shared_file
                    except Exception as e:
                        logger.error(f"Error copying output file to shared location: {e}")
                
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} is complete. Collected data from r/{job['subreddit']}. Output file: {job['output_file']}"
                    }]
                }
            elif actual_status == "failed":
                job["error"] = status_result.get("error", "Unknown error")
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} failed: {job.get('error', 'Unknown error')}"
                    }]
                }
            else:
                # Job is still running
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} is running. Progress: {job['progress']}% complete."
                    }]
                }
        else:
            # Return the stored status
            if job["status"] == "completed":
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} is complete. Collected data from r/{job['subreddit']}. Output file: {job['output_file']}"
                    }]
                }
            elif job["status"] == "failed":
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} failed: {job.get('error', 'Unknown error')}"
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Job {job_id} status: {job['status']}. Progress: {job['progress']}% complete."
                    }]
                }
    except Exception as e:
        logger.error(f"Error in reddit_get_job_status: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error checking job status: {str(e)}"
            }]
        }

@reddit_server.tool(
    "reddit_list_jobs",
    {}
)
async def reddit_list_jobs():
    """List all Reddit collection jobs"""
    try:
        if not jobs:
            return {
                "content": [{
                    "type": "text",
                    "text": "No active or completed collection jobs found."
                }]
            }
        
        job_list = []
        for job_id, job in jobs.items():
            job_list.append({
                "job_id": job_id,
                "subreddit": job["subreddit"],
                "status": job["status"],
                "progress": job["progress"],
                "post_count": job["post_count"],
                "time_filter": job["time_filter"]
            })
        
        return {
            "content": [{
                "type": "text",
                "text": f"Found {len(job_list)} jobs.\n\n" + json.dumps(job_list, indent=2)
            }]
        }
    except Exception as e:
        logger.error(f"Error in reddit_list_jobs: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error listing jobs: {str(e)}"
            }]
        }

@reddit_server.tool(
    "reddit_get_file_content",
    {
        "job_id": Parameters.String(description="Job ID to get file for")
    }
)
async def reddit_get_file_content(job_id):
    """Get the collected data file for a job"""
    try:
        if job_id not in jobs:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = jobs[job_id]
        
        if job["status"] != "completed":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} is not completed. Current status: {job['status']}"
                }]
            }
        
        if not job["output_file"]:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: No output file available for job {job_id}."
                }]
            }
        
        file_path = job["output_file"]
        
        # Upload the file to the upload service to make it available to other MCP services
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Prepare upload payload
        import base64
        encoded_content = base64.b64encode(file_data).decode('utf-8')
        
        # Call upload service
        upload_response = requests.post(
            "http://upload-mcp:8004/upload",
            json={
                "file_content": encoded_content,
                "file_name": os.path.basename(file_path),
                "mime_type": "application/pdf"
            }
        )
        
        if upload_response.status_code != 200:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error uploading file to shared service: {upload_response.text}"
                }]
            }
        
        upload_result = upload_response.json()
        
        # Return the file ID from the upload service
        return {
            "content": [{
                "type": "text",
                "text": f"File from job {job_id} is available. File ID: {upload_result.get('file_id')}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in reddit_get_file_content: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error getting file content: {str(e)}"
            }]
        }

# Start the server
if __name__ == "__main__":
    # Create shared directory if it doesn't exist
    os.makedirs("/shared", exist_ok=True)
    
    # Start the MCP server
    reddit_server.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
```

## 2. Social Research Analysis Tool MCP Server Implementation

```python
# social-mcp/server.py
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.tools import Tool, Parameters
import requests
import os
import json
import time
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Social Research Tool URLs
SOCIAL_RESEARCH_BACKEND_URL = os.environ.get("SOCIAL_RESEARCH_BACKEND_URL", "http://social-research-backend:8081")
SOCIAL_RESEARCH_FRONTEND_URL = os.environ.get("SOCIAL_RESEARCH_FRONTEND_URL", "http://social-research-frontend:3000")

# Initialize MCP server
social_server = FastMCP("Social Research Analysis Tool")

# Active analysis jobs
jobs = {}

@social_server.tool(
    "social_run_topic_modeling",
    {
        "file_id": Parameters.String(description="ID of the uploaded file to analyze"),
        "num_topics": Parameters.Integer(description="Number of topics to identify", default=10)
    }
)
async def social_run_topic_modeling(file_id, num_topics=10):
    """Run topic modeling on an uploaded file"""
    try:
        logger.info(f"Running topic modeling on file {file_id} with {num_topics} topics")
        
        # Parameter validation
        if not file_id:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: File ID is required."
                }]
            }
        
        if num_topics < 1 or num_topics > 50:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Number of topics must be between 1 and 50."
                }]
            }
        
        # Get file info from upload service
        file_info_response = requests.get(f"http://upload-mcp:8004/files/{file_id}")
        if file_info_response.status_code != 200:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Could not retrieve file information for {file_id}"
                }]
            }
        
        file_info = file_info_response.json()
        file_path = file_info.get("file_path")
        
        if not file_path:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: File path not found for {file_id}"
                }]
            }
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job in our tracking system
        jobs[job_id] = {
            "status": "initializing",
            "progress": 0,
            "file_id": file_id,
            "file_path": file_path,
            "num_topics": num_topics,
            "start_time": time.time(),
            "topics": [],
            "visualizations": [],
            "output_file": None
        }
        
        # Read the file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Prepare multipart form data
        files = {
            'file': (os.path.basename(file_path), file_data, file_info.get("mime_type", "application/octet-stream"))
        }
        
        # Map our parameters to what the Social Research Tool expects
        api_params = {
            "analysis_type": "topic_modeling",
            "num_topics": num_topics
        }
        
        # Call the Social Research Tool API to start the job
        response = requests.post(
            f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analyze",
            files=files,
            data=api_params
        )
        
        if response.status_code != 200:
            logger.error(f"Error from Social Research Tool: {response.text}")
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = f"API error: {response.text}"
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error starting topic modeling: API returned status {response.status_code}"
                }]
            }
        
        # Get the analysis ID from the response
        result = response.json()
        analysis_id = result.get("analysis_id", "unknown")
        
        # Update our job tracking with the actual analysis ID
        jobs[job_id]["analysis_id"] = analysis_id
        jobs[job_id]["status"] = "running"
        
        # Start a background thread to periodically check status
        import threading
        
        def check_status_thread():
            try:
                while True:
                    if job_id not in jobs:
                        break
                    
                    if jobs[job_id]["status"] in ["completed", "failed"]:
                        break
                    
                    # Check status from the Social Research Tool
                    status_response = requests.get(
                        f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analysis/{analysis_id}/status"
                    )
                    
                    if status_response.status_code != 200:
                        logger.error(f"Error checking status: {status_response.text}")
                        time.sleep(5)
                        continue
                    
                    status_result = status_response.json()
                    actual_status = status_result.get("status", "unknown")
                    actual_progress = status_result.get("progress", 0)
                    
                    # Update our job tracking
                    jobs[job_id]["status"] = actual_status
                    jobs[job_id]["progress"] = actual_progress
                    
                    if actual_status == "completed":
                        # Get results from the Social Research Tool
                        results_response = requests.get(
                            f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analysis/{analysis_id}/results"
                        )
                        
                        if results_response.status_code != 200:
                            logger.error(f"Error getting results: {results_response.text}")
                            jobs[job_id]["status"] = "failed"
                            jobs[job_id]["error"] = f"Error getting results: {results_response.text}"
                            break
                        
                        # Parse results
                        analysis_results = results_response.json()
                        
                        # Save results in our job tracking
                        jobs[job_id]["topics"] = analysis_results.get("topics", [])
                        jobs[job_id]["visualizations"] = analysis_results.get("visualizations", [])
                        jobs[job_id]["end_time"] = time.time()
                        
                        # Save results to a JSON file
                        output_file = f"/shared/topic_analysis_{job_id}.json"
                        with open(output_file, "w") as f:
                            json.dump(analysis_results, f, indent=2)
                        
                        jobs[job_id]["output_file"] = output_file
                        break
                    
                    # Sleep before checking again
                    time.sleep(5)
            except Exception as e:
                logger.error(f"Error in check_status_thread: {e}")
                if job_id in jobs:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = str(e)
        
        # Start the thread
        status_thread = threading.Thread(target=check_status_thread)
        status_thread.daemon = True
        status_thread.start()
        
        return {
            "content": [{
                "type": "text",
                "text": f"Started topic modeling job for file {file_id} with {num_topics} topics. Job ID: {job_id}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in social_run_topic_modeling: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error running topic modeling: {str(e)}"
            }]
        }

@social_server.tool(
    "social_run_sentiment_analysis",
    {
        "file_id": Parameters.String(description="ID of the uploaded file to analyze"),
        "topic": Parameters.String(description="Topic to analyze (optional)", default=None)
    }
)
async def social_run_sentiment_analysis(file_id, topic=None):
    """Run sentiment analysis on an uploaded file"""
    try:
        logger.info(f"Running sentiment analysis on file {file_id}" + (f" for topic {topic}" if topic else ""))
        
        # Parameter validation
        if not file_id:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: File ID is required."
                }]
            }
        
        # Get file info from upload service
        file_info_response = requests.get(f"http://upload-mcp:8004/files/{file_id}")
        if file_info_response.status_code != 200:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Could not retrieve file information for {file_id}"
                }]
            }
        
        file_info = file_info_response.json()
        file_path = file_info.get("file_path")
        
        if not file_path:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: File path not found for {file_id}"
                }]
            }
        
        # Generate a unique job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job in our tracking system
        jobs[job_id] = {
            "status": "initializing",
            "progress": 0,
            "file_id": file_id,
            "file_path": file_path,
            "topic": topic,
            "start_time": time.time(),
            "sentiments": [],
            "visualizations": [],
            "output_file": None
        }
        
        # Read the file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Prepare multipart form data
        files = {
            'file': (os.path.basename(file_path), file_data, file_info.get("mime_type", "application/octet-stream"))
        }
        
        # Map our parameters to what the Social Research Tool expects
        api_params = {
            "analysis_type": "sentiment_analysis"
        }
        
        if topic:
            api_params["topic"] = topic
        
        # Call the Social Research Tool API to start the job
        response = requests.post(
            f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analyze",
            files=files,
            data=api_params
        )
        
        if response.status_code != 200:
            logger.error(f"Error from Social Research Tool: {response.text}")
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = f"API error: {response.text}"
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error starting sentiment analysis: API returned status {response.status_code}"
                }]
            }
        
        # Get the analysis ID from the response
        result = response.json()
        analysis_id = result.get("analysis_id", "unknown")
        
        # Update our job tracking with the actual analysis ID
        jobs[job_id]["analysis_id"] = analysis_id
        jobs[job_id]["status"] = "running"
        
        # Start a background thread to periodically check status
        import threading
        
        def check_status_thread():
            try:
                while True:
                    if job_id not in jobs:
                        break
                    
                    if jobs[job_id]["status"] in ["completed", "failed"]:
                        break
                    
                    # Check status from the Social Research Tool
                    status_response = requests.get(
                        f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analysis/{analysis_id}/status"
                    )
                    
                    if status_response.status_code != 200:
                        logger.error(f"Error checking status: {status_response.text}")
                        time.sleep(5)
                        continue
                    
                    status_result = status_response.json()
                    actual_status = status_result.get("status", "unknown")
                    actual_progress = status_result.get("progress", 0)
                    
                    # Update our job tracking
                    jobs[job_id]["status"] = actual_status
                    jobs[job_id]["progress"] = actual_progress
                    
                    if actual_status == "completed":
                        # Get results from the Social Research Tool
                        results_response = requests.get(
                            f"{SOCIAL_RESEARCH_BACKEND_URL}/api/analysis/{analysis_id}/results"
                        )
                        
                        if results_response.status_code != 200:
                            logger.error(f"Error getting results: {results_response.text}")
                            jobs[job_id]["status"] = "failed"
                            jobs[job_id]["error"] = f"Error getting results: {results_response.text}"
                            break
                        
                        # Parse results
                        analysis_results = results_response.json()
                        
                        # Save results in our job tracking
                        jobs[job_id]["sentiments"] = analysis_results.get("sentiments", [])
                        jobs[job_id]["visualizations"] = analysis_results.get("visualizations", [])
                        jobs[job_id]["end_time"] = time.time()
                        
                        # Save results to a JSON file
                        output_file = f"/shared/sentiment_analysis_{job_id}.json"
                        with open(output_file, "w") as f:
                            json.dump(analysis_results, f, indent=2)
                        
                        jobs[job_id]["output_file"] = output_file
                        break
                    
                    # Sleep before checking again
                    time.sleep(5)
            except Exception as e:
                logger.error(f"Error in check_status_thread: {e}")
                if job_id in jobs:
                    jobs[job_id]["status"] = "failed"
                    jobs[job_id]["error"] = str(e)
        
        # Start the thread
        status_thread = threading.Thread(target=check_status_thread)
        status_thread.daemon = True
        status_thread.start()
        
        return {
            "content": [{
                "type": "text",
                "text": f"Started sentiment analysis job for file {file_id}" + (f" with topic filter: {topic}" if topic else "") + f". Job ID: {job_id}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in social_run_sentiment_analysis: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error running sentiment analysis: {str(e)}"
            }]
        }

@social_server.tool(
    "social_get_job_status",
    {
        "job_id": Parameters.String(description="Job ID to check")
    }
)
async def social_get_job_status(job_id):
    """Check the status of an analysis job"""
    try:
        if job_id not in jobs:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = jobs[job_id]
        
        if job["status"] == "running":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Job {job_id} is running. Progress: {job['progress']}% complete."
                }]
            }
        elif job["status"] == "completed":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Job {job_id} is complete. Output file: {job['output_file']}"
                }]
            }
        else:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Job {job_id} {job['status']}: {job.get('error', 'Unknown error')}"
                }]
            }
    except Exception as e:
        logger.error(f"Error in social_get_job_status: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error checking job status: {str(e)}"
            }]
        }

@social_server.tool(
    "social_get_job_results",
    {
        "job_id": Parameters.String(description="Job ID to get results for")
    }
)
async def social_get_job_results(job_id):
    """Get the results of a completed analysis job"""
    try:
        if job_id not in jobs:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = jobs[job_id]
        
        if job["status"] != "completed":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} is not completed. Current status: {job['status']}"
                }]
            }
        
        # Return results based on job type
        if "topics" in job:
            # Topic modeling results
            topic_results = []
            for topic in job["topics"]:
                topic_results.append(f"Topic {topic['topic_id']}: {', '.join(topic['words'][:5])} (Documents: {topic['count']})")
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Topic modeling results for job {job_id}:\n\n" + "\n".join(topic_results)
                }]
            }
        elif "sentiments" in job:
            # Sentiment analysis results
            sentiment_counts = {
                "positive": sum(1 for s in job["sentiments"] if s["sentiment"] == "positive"),
                "neutral": sum(1 for s in job["sentiments"] if s["sentiment"] == "neutral"),
                "negative": sum(1 for s in job["sentiments"] if s["sentiment"] == "negative")
            }
            
            total = len(job["sentiments"])
            if total == 0:
                total = 1  # Avoid division by zero
            
            return {
                "content": [{
                    "type": "text",
                    "text": f"Sentiment analysis results for job {job_id}:\n\n" +
                           f"Total documents analyzed: {len(job['sentiments'])}\n" +
                           f"Positive: {sentiment_counts['positive']} ({sentiment_counts['positive']/total*100:.1f}%)\n" +
                           f"Neutral: {sentiment_counts['neutral']} ({sentiment_counts['neutral']/total*100:.1f}%)\n" +
                           f"Negative: {sentiment_counts['negative']} ({sentiment_counts['negative']/total*100:.1f}%)"
                }]
            }
        else:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Job {job_id} completed successfully, but no specific results were found."
                }]
            }
    except Exception as e:
        logger.error(f"Error in social_get_job_results: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error getting job results: {str(e)}"
            }]
        }

# Start the server
if __name__ == "__main__":
    # Create shared directory if it doesn't exist
    os.makedirs("/shared", exist_ok=True)
    
    # Start the MCP server
    social_server.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8002)))
```

## 3. Journey Mapper MCP Server Implementation

```python
# journey-mcp/server.py
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.tools import Tool, Parameters
import requests
import os
import json
import time
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Journey Mapper URL
JOURNEY_MAPPER_URL = os.environ.get("JOURNEY_MAPPER_URL", "http://journey-mapper:8000")

# Initialize MCP server
journey_server = FastMCP("AI Journey Mapper")

# Store for completed journey maps
journey_results = {}

@journey_server.tool(
    "journey_upload_file",
    {
        "file_id": Parameters.String(description="ID of the file to upload"),
        "journey_name": Parameters.String(description="Name for the journey map"),
        "focus_area": Parameters.String(description="Area to focus on", required=False)
    }
)
async def journey_upload_file(file_id, journey_name, focus_area=None):
    """Upload a file and generate a journey map in one step"""
    try:
        logger.info(f"Generating journey map from file {file_id} with name {journey_name}")
        
        # Parameter validation
        if not file_id:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: File ID is required."
                }]
            }
        
        if not journey_name:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Journey name is required."
                }]
            }
        
        # Get file info from upload service
        file_info_response = requests.get(f"http://upload-mcp:8004/files/{file_id}")
        if file_info_response.status_code != 200:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Could not retrieve file information for {file_id}"
                }]
            }
        
        file_info = file_info_response.json()
        file_path = file_info.get("file_path")
        
        if not file_path:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: File path not found for {file_id}"
                }]
            }
        
        # Read the file
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Prepare multipart form data
        files = {
            'file': (os.path.basename(file_path), file_data, file_info.get("mime_type", "application/octet-stream"))
        }
        
        data = {
            'journey_name': journey_name
        }
        
        if focus_area:
            data['focus_area'] = focus_area
        
        # Send request to Journey Mapper - using the ACTUAL endpoint
        response = requests.post(
            f"{JOURNEY_MAPPER_URL}/api/analyze",  # The actual endpoint
            files=files,
            data=data
        )
        
        if response.status_code != 200:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error generating journey map: {response.text}"
                }]
            }
        
        # Parse response
        journey_result = response.json()
        
        # Generate a synthetic job ID since we're adapting a synchronous API to an async interface
        job_id = f"journey_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        # Store result for status checks
        journey_results[job_id] = {
            "status": "completed",
            "journey_name": journey_name,
            "file_id": file_id,
            "result": journey_result,
            "html_url": journey_result.get("html_url", ""),
            "pdf_url": journey_result.get("pdf_url", "")
        }
        
        return {
            "content": [{
                "type": "text",
                "text": f"Journey map '{journey_name}' successfully generated! Job ID: {job_id}"
            }]
        }
        
    except Exception as e:
        logger.error(f"Error in journey_upload_file: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error generating journey map: {str(e)}"
            }]
        }

@journey_server.tool(
    "journey_get_status",
    {
        "job_id": Parameters.String(description="Job ID to check")
    }
)
async def journey_get_status(job_id):
    """Check status of a journey mapping job"""
    try:
        # Get result from memory cache
        if job_id not in journey_results:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = journey_results[job_id]
        
        # Since journey-mapper is synchronous, we always return completed
        return {
            "content": [{
                "type": "text",
                "text": f"Journey map '{job['journey_name']}' is complete and ready to view."
            }]
        }
        
    except Exception as e:
        logger.error(f"Error in journey_get_status: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error checking job status: {str(e)}"
            }]
        }

@journey_server.tool(
    "journey_get_map_summary",
    {
        "job_id": Parameters.String(description="Job ID to summarize")
    }
)
async def journey_get_map_summary(job_id):
    """Get a summary of a completed journey map"""
    try:
        if job_id not in journey_results:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = journey_results[job_id]
        
        if job["status"] != "completed":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} is not completed. Current status: {job['status']}"
                }]
            }
        
        journey_map = job["result"]
        
        # Generate summary
        stages = journey_map.get("stages", [])
        
        # Calculate aggregate statistics
        pain_points = 0
        opportunities = 0
        for stage in stages:
            pain_points += len(stage.get("pain_points", []))
            opportunities += len(stage.get("opportunities", []))
        
        summary = f"""
Journey Map: {job['journey_name']}

This journey map contains {len(stages)} stages:
{", ".join(stage.get("name", "Unnamed Stage") for stage in stages)}

Key findings:
- {pain_points} pain points identified
- {opportunities} improvement opportunities suggested

The journey map is available in HTML format at {job.get('html_url', 'N/A')}
and in PDF format at {job.get('pdf_url', 'N/A')}
        """
        
        return {
            "content": [{
                "type": "text",
                "text": summary.strip()
            }]
        }
    except Exception as e:
        logger.error(f"Error in journey_get_map_summary: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error getting journey map summary: {str(e)}"
            }]
        }

@journey_server.tool(
    "journey_export_map",
    {
        "job_id": Parameters.String(description="Job ID to export"),
        "format": Parameters.String(description="Export format", enum=["html", "pdf"])
    }
)
async def journey_export_map(job_id, format):
    """Export a journey map in the specified format"""
    try:
        if job_id not in journey_results:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} not found."
                }]
            }
        
        job = journey_results[job_id]
        
        if job["status"] != "completed":
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Job {job_id} is not completed. Current status: {job['status']}"
                }]
            }
        
        # Get the URL for the requested format
        if format.lower() == "html":
            url = job.get("html_url")
        elif format.lower() == "pdf":
            url = job.get("pdf_url")
        else:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Unsupported format {format}. Supported formats: html, pdf"
                }]
            }
        
        if not url:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Format {format} not available for this journey map."
                }]
            }
        
        return {
            "content": [{
                "type": "text",
                "text": f"Journey map '{job['journey_name']}' is available in {format.upper()} format at: {url}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in journey_export_map: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error exporting journey map: {str(e)}"
            }]
        }

# Start the server
if __name__ == "__main__":
    # Create shared directory if it doesn't exist
    os.makedirs("/shared", exist_ok=True)
    
    # Start the MCP server
    journey_server.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8003)))
```

## 4. File Upload MCP Server Implementation

```python
# upload-mcp/server.py
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.tools import Tool, Parameters
import os
import uuid
import base64
import time
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MCP server
upload_server = FastMCP("File Upload Service")

# Store for uploaded files
uploaded_files = {}

@upload_server.tool(
    "upload_file",
    {
        "file_content": Parameters.String(description="Base64 encoded file content"),
        "file_name": Parameters.String(description="Original filename"),
        "mime_type": Parameters.String(description="MIME type of the file")
    }
)
async def upload_file(file_content, file_name, mime_type):
    """Upload a file to the system"""
    try:
        # Parameter validation
        if not file_content:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: File content is required."
                }]
            }
        
        if not file_name:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: File name is required."
                }]
            }
        
        # Decode base64 content
        try:
            decoded_content = base64.b64decode(file_content)
        except Exception as e:
            logger.error(f"Error decoding base64 content: {e}")
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: Invalid base64 encoding. {str(e)}"
                }]
            }
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        
        # Determine file extension
        file_ext = os.path.splitext(file_name)[1]
        if not file_ext and mime_type:
            import mimetypes
            extension = mimetypes.guess_extension(mime_type)
            if extension:
                file_name += extension
        
        # Save file
        file_path = f"/shared/{file_id}_{file_name}"
        with open(file_path, "wb") as f:
            f.write(decoded_content)
        
        # Store file info
        uploaded_files[file_id] = {
            "file_id": file_id,
            "file_name": file_name,
            "mime_type": mime_type,
            "file_path": file_path,
            "upload_time": time.time(),
            "size": len(decoded_content)
        }
        
        return {
            "content": [{
                "type": "text",
                "text": f"File uploaded successfully. File ID: {file_id}\nPath: {file_path}\nSize: {len(decoded_content)} bytes"
            }]
        }
    except Exception as e:
        logger.error(f"Error in upload_file: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error uploading file: {str(e)}"
            }]
        }

@upload_server.tool(
    "get_file_info",
    {
        "file_id": Parameters.String(description="File ID to get info for")
    }
)
async def get_file_info(file_id):
    """Get information about an uploaded file"""
    try:
        if file_id not in uploaded_files:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: File with ID {file_id} not found."
                }]
            }
        
        file_info = uploaded_files[file_id]
        
        return {
            "content": [{
                "type": "text",
                "text": f"File Information:\nID: {file_info['file_id']}\nName: {file_info['file_name']}\nMIME Type: {file_info['mime_type']}\nPath: {file_info['file_path']}\nSize: {file_info['size']} bytes\nUploaded: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_info['upload_time']))}"
            }]
        }
    except Exception as e:
        logger.error(f"Error in get_file_info: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error getting file info: {str(e)}"
            }]
        }

@upload_server.tool(
    "list_files",
    {}
)
async def list_files():
    """List all uploaded files"""
    try:
        if not uploaded_files:
            return {
                "content": [{
                    "type": "text",
                    "text": "No files have been uploaded yet."
                }]
            }
        
        file_list = []
        for file_id, file_info in uploaded_files.items():
            file_list.append({
                "file_id": file_id,
                "file_name": file_info["file_name"],
                "mime_type": file_info["mime_type"],
                "size": file_info["size"],
                "upload_time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(file_info['upload_time']))
            })
        
        return {
            "content": [{
                "type": "text",
                "text": f"Found {len(file_list)} uploaded files:\n\n" + "\n".join([
                    f"{i+1}. {file['file_name']} (ID: {file['file_id']}, Type: {file['mime_type']})"
                    for i, file in enumerate(file_list)
                ])
            }]
        }
    except Exception as e:
        logger.error(f"Error in list_files: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error listing files: {str(e)}"
            }]
        }

@upload_server.tool(
    "delete_file",
    {
        "file_id": Parameters.String(description="File ID to delete")
    }
)
async def delete_file(file_id):
    """Delete an uploaded file"""
    try:
        if file_id not in uploaded_files:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Error: File with ID {file_id} not found."
                }]
            }
        
        file_info = uploaded_files[file_id]
        
        # Delete file
        try:
            os.remove(file_info["file_path"])
        except Exception as e:
            logger.warning(f"Error deleting file: {e}")
        
        # Remove from registry
        del uploaded_files[file_id]
        
        return {
            "content": [{
                "type": "text",
                "text": f"File {file_info['file_name']} (ID: {file_id}) has been deleted."
            }]
        }
    except Exception as e:
        logger.error(f"Error in delete_file: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error deleting file: {str(e)}"
            }]
        }

# Start the server
if __name__ == "__main__":
    # Create shared directory if it doesn't exist
    os.makedirs("/shared", exist_ok=True)
    
    # Start the MCP server
    upload_server.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8004)))
```

## 5. Agent System Prompt

```
# Claude System Prompt for NXT HUMANS CX Workbench

You are an AI assistant integrated with the NXT HUMANS CX WORKBENCH. You help users with:

1. Reddit Data Collection (collect and analyze social data)
2. Social Research Analysis (extract insights from data)
3. Customer Journey Mapping (create visual journey maps)

## IMPORTANT TOOL USAGE INSTRUCTIONS

When users ask to create journey maps or analyze data:
1. DO NOT show tool calls as text/JSON
2. Always EXECUTE the tool directly using the provided parameters
3. NEVER return raw JSON of a tool call to the user

## REDDIT DATA COLLECTION

When a user wants to collect data from Reddit:

1. Ask for the subreddit name
2. Ask for the time period (day/week/month/year/all)
3. Ask for the number of posts (default: 100)
4. Ask for the comments per post (default: 30)
5. Use reddit_collect_data tool
6. Check status with reddit_get_job_status
7. When complete, describe the results

## SOCIAL RESEARCH ANALYSIS

When a user wants to analyze data:

1. If no file ID is provided, ask them to upload a file
2. For topic modeling:
   - Ask how many topics to identify (default: 10)
   - Use social_run_topic_modeling tool with the file_id
3. For sentiment analysis:
   - Ask if they want to analyze a specific topic (optional)
   - Use social_run_sentiment_analysis tool
4. Check status with social_get_job_status
5. When complete, explain the results with social_get_job_results

## JOURNEY MAPPING WORKFLOW

When a user wants to create a journey map:

1. If no file ID is provided, ask them to upload a file
2. Ask for a journey name (descriptive title)
3. Ask if they want to focus on a specific area (optional)
4. Use journey_upload_file tool
5. Check status with journey_get_status
6. When complete, get a summary with journey_get_map_summary
7. Offer to export in HTML or PDF format with journey_export_map

## FILE HANDLING

When user uploads a file:
1. Note the file_id for future reference
2. Suggest appropriate analysis based on file content
3. Store the file_id in conversation context for later tool calls

Keep explanations clear and simple. Focus on guiding the user through the process rather than explaining technical details.
```

## 6. WebSocket Proxy Implementation

```python
@sock.route('/ws-proxy/<conversation_id>')
def ws_proxy(ws, conversation_id):
    """WebSocket proxy that handles communication with agent service"""
    
    # Log connection start
    logger.info(f"New WebSocket proxy connection: {conversation_id}")
    
    # Get agent WebSocket URL
    agent_ws_url = f"ws://agent:8000/ws/{conversation_id}"
    logger.info(f"Connecting to agent at: {agent_ws_url}")
    
    # Setup connection tracking
    agent_ws = None
    should_close = threading.Event()
    
    # Send initial status to client
    try:
        ws.send(json.dumps({
            "type": "status",
            "status": "connecting",
            "message": "Connecting to agent..."
        }))
    except Exception as e:
        logger.error(f"Error sending initial status: {e}")
    
    # Function to forward messages from agent to client
    def agent_to_client():
        nonlocal agent_ws
        
        try:
            # Open connection to agent
            agent_ws = websocket.create_connection(
                agent_ws_url,
                header=["Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits"],
                enable_multithread=True,
                ping_interval=15,
                ping_timeout=10
            )
            
            # Send connection success to client
            try:
                ws.send(json.dumps({
                    "type": "status",
                    "status": "connected",
                    "message": "Connected to agent"
                }))
            except Exception as e:
                logger.error(f"Error sending connection success: {e}")
            
            # Forward messages from agent to client
            while not should_close.is_set():
                try:
                    message = agent_ws.recv()
                    if message:
                        ws.send(message)
                except websocket.WebSocketConnectionClosedException:
                    logger.warning("Agent WebSocket connection closed")
                    try:
                        ws.send(json.dumps({
                            "type": "error",
                            "message": "Agent connection closed unexpectedly"
                        }))
                    except:
                        pass
                    break
                except Exception as e:
                    logger.error(f"Error receiving from agent: {e}")
                    break
                
        except (ConnectionRefusedError, websocket.WebSocketBadStatusException) as e:
            logger.error(f"Could not connect to agent: {e}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "message": f"Could not connect to agent service: {str(e)}"
                }))
            except:
                pass
        except Exception as e:
            logger.error(f"Error in agent_to_client: {e}")
            try:
                ws.send(json.dumps({
                    "type": "error",
                    "message": f"Error communicating with agent: {str(e)}"
                }))
            except:
                pass
        finally:
            # Signal the other thread to stop
            should_close.set()
    
    # Start the agent-to-client thread
    forward_thread = threading.Thread(target=agent_to_client)
    forward_thread.daemon = True
    forward_thread.start()
    
    # Forward messages from client to agent
    try:
        while not should_close.is_set():
            try:
                # Use a timeout to allow checking should_close periodically
                message = ws.receive(timeout=0.5)
                if message and agent_ws:
                    agent_ws.send(message)
            except websocket.WebSocketConnectionClosedException:
                logger.warning("Agent connection closed while sending")
                break
            except Exception as e:
                if "Timed out" in str(e):
                    # This is expected due to our timeout
                    continue
                logger.error(f"Error in client-to-agent: {e}")
                break
    except Exception as e:
        logger.error(f"Error in ws_proxy main loop: {e}")
    finally:
        # Clean up
        should_close.set()
        
        if agent_ws:
            try:
                agent_ws.close()
            except:
                pass
        
        logger.info(f"WebSocket proxy connection closed: {conversation_id}")
```

## 7. Docker Configuration

```yaml
# docker-compose.override.yml
version: '3'

services:
  agent:
    container_name: agent
    hostname: agent
    networks:
      - nxt-humans-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s
    environment:
      - REDIS_URL=redis://redis:6379/0
      - REDDIT_MCP_URL=http://reddit-mcp:8001
      - SOCIAL_MCP_URL=http://social-mcp:8002
      - JOURNEY_MCP_URL=http://journey-mcp:8003
      - UPLOAD_MCP_URL=http://upload-mcp:8004
    restart: unless-stopped
    depends_on:
      - redis

  reddit-mcp:
    environment:
      - REDDIT_COLLECTOR_URL=http://reddit-ripper:5000
    volumes:
      - ./shared:/shared
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  social-mcp:
    environment:
      - SOCIAL_RESEARCH_BACKEND_URL=http://social-research-backend:8081
      - SOCIAL_RESEARCH_FRONTEND_URL=http://social-research-frontend:3000
    volumes:
      - ./shared:/shared
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  journey-mcp:
    environment:
      - JOURNEY_MAPPER_URL=http://journey-mapper:8000
    volumes:
      - ./shared:/shared
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  upload-mcp:
    volumes:
      - ./shared:/shared
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: redis
    hostname: redis
    networks:
      - nxt-humans-network
    restart: unless-stopped

  launchpad:
    depends_on:
      - agent
      - reddit-mcp
      - social-mcp
      - journey-mcp
      - upload-mcp
    extra_hosts:
      - "agent:172.19.0.8"  # Update this IP to match your container's IP
```

## 8. Debug Script

```bash
#!/bin/bash
# debug.sh

# Output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== NXT HUMANS CX WORKBENCH DEBUG TOOL ===${NC}"
echo "This script will diagnose common issues with the MCP agent integration."

# Check if Docker is running
echo -e "\n${YELLOW}Checking if Docker is running...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}Docker is running.${NC}"
else
    echo -e "${RED}Docker is not running! Please start Docker and try again.${NC}"
    exit 1
fi

# Check container status
echo -e "\n${YELLOW}Checking container status...${NC}"
docker compose ps

# Check network
echo -e "\n${YELLOW}Checking Docker network...${NC}"
docker network inspect nxt-humans-network > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Network 'nxt-humans-network' exists.${NC}"
    
    # Get all containers on the network
    echo -e "\n${YELLOW}Containers on nxt-humans-network:${NC}"
    docker network inspect nxt-humans-network -f '{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{println}}{{end}}'
else
    echo -e "${RED}Network 'nxt-humans-network' does not exist!${NC}"
fi

# Get agent container IP
echo -e "\n${YELLOW}Getting agent container IP...${NC}"
AGENT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent 2>/dev/null)
if [ -n "$AGENT_IP" ]; then
    echo -e "${GREEN}Agent IP: $AGENT_IP${NC}"
else
    echo -e "${RED}Could not get agent IP. Is the container running?${NC}"
fi

# Test DNS resolution from launchpad
echo -e "\n${YELLOW}Testing DNS resolution from launchpad...${NC}"
docker exec launchpad ping -c 1 agent > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Launchpad can resolve 'agent' hostname.${NC}"
else
    echo -e "${RED}Launchpad cannot resolve 'agent' hostname!${NC}"
    echo -e "Trying manual DNS resolution..."
    
    docker exec launchpad cat /etc/resolv.conf
    docker exec launchpad cat /etc/hosts
    
    echo -e "\nFix: Add this to docker-compose.override.yml in launchpad service:"
    echo -e "extra_hosts:"
    echo -e "  - \"agent:$AGENT_IP\""
fi

# Test WebSocket from launchpad to agent
echo -e "\n${YELLOW}Testing WebSocket communication...${NC}"
docker exec launchpad curl -s -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Host: agent:8000" -H "Origin: http://localhost" http://agent:8000/ws/test > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}WebSocket connection to agent appears possible.${NC}"
else
    echo -e "${RED}WebSocket connection to agent failed!${NC}"
    echo -e "Fix: Check if agent container is running and the WebSocket server is started."
fi

# Check MCP server API endpoints
echo -e "\n${YELLOW}Checking MCP server endpoints...${NC}"
for service in reddit-mcp social-mcp journey-mcp upload-mcp; do
    docker exec launchpad curl -s http://$service:8001/ > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}$service is reachable from launchpad.${NC}"
    else
        echo -e "${RED}$service is not reachable from launchpad!${NC}"
    fi
done

# Check agent container logs
echo -e "\n${YELLOW}Checking agent container logs for errors...${NC}"
docker logs --tail 20 agent | grep -i "error\|exception\|fail"

echo -e "\n${BLUE}==== Debug Complete ====${NC}"
echo "If issues persist, please check the detailed logs for each container:"
echo "docker logs launchpad"
echo "docker logs agent"
echo "docker logs reddit-mcp"
echo "docker logs social-mcp"
echo "docker logs journey-mcp"
echo "docker logs upload-mcp"
```

## 9. Deployment Guide

### Step 1: Prepare Environment

1. Set up directory structure:
```bash
mkdir -p shared
```

2. Create `.env` file:
```
ANTHROPIC_API_KEY=your_api_key_here
ENABLE_CX_AGENT=true
```

### Step 2: Update Docker Configuration

1. Create or update `docker-compose.override.yml` with the configuration from section 7.

2. Update IP addresses:
```bash
# Get IP address of agent container
AGENT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' agent)

# Update docker-compose.override.yml
sed -i "s/agent:172.19.0.8/agent:$AGENT_IP/" docker-compose.override.yml
```

### Step 3: Deploy Services

1. Start core services first:
```bash
docker compose up -d redis
docker compose up -d upload-mcp
docker compose up -d reddit-mcp social-mcp journey-mcp
```

2. Wait for services to start:
```bash
sleep 5
```

3. Start agent:
```bash
docker compose up -d agent
```

4. Wait for agent to start:
```bash
sleep 5
```

5. Start launchpad:
```bash
docker compose up -d launchpad
```

### Step 4: Verify Deployment

1. Run debug script:
```bash
chmod +x debug.sh
./debug.sh
```

2. Check all services are healthy:
```bash
docker compose ps
```

### Step 5: Testing

1. Access the launchpad at `http://localhost:8000`
2. Test agent websocket connection in browser console:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws-proxy/test123');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

## 10. Troubleshooting

### Problem: DNS Resolution Failure

**Solution 1**: Add extra_hosts to launchpad
```yaml
launchpad:
  extra_hosts:
    - "agent:172.19.0.8"  # Update with actual IP
```

**Solution 2**: Force container to use host DNS
```yaml
agent:
  dns:
    - 8.8.8.8
    - 8.8.4.4
```

### Problem: WebSocket Connection Failures

**Solution 1**: Check correct WebSocket URL
```python
agent_ws_url = f"ws://agent:8000/ws/{conversation_id}"  # Use container hostname
```

**Solution 2**: Disable compression
```python
agent_ws = websocket.create_connection(
    agent_ws_url,
    enable_multithread=True,
    ping_interval=15,
    ping_timeout=10,
    suppress_origin=True  # Add this
)
```

### Problem: API Parameter Mismatch

**Solution**: Add parameter mapping in MCP tool implementation
```python
# Convert from Claude's expected parameters to actual API parameters
if "file_id" in tool_args and "file" not in tool_args:
    file_id = tool_args.pop("file_id")
    tool_args["file"] = file_id
```

