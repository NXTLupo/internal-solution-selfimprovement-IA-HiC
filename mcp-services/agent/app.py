"""
Agent Orchestrator Service
-------------------------
This service orchestrates the interaction between Claude and the MCP tool services.
It manages conversation state, coordinates tool invocations, and formats responses.
"""

import os
import json
import logging
import uuid
import time
import asyncio
import requests
import tempfile
from typing import Dict, List, Any, Optional, Union, Tuple
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field
from websockets.exceptions import ConnectionClosedError
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("agent-orchestrator")

# Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    logger.error("ANTHROPIC_API_KEY environment variable not set")
    raise ValueError("ANTHROPIC_API_KEY environment variable must be set")

ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

REDDIT_MCP_URL = os.environ.get("REDDIT_MCP_URL", "http://reddit-mcp:8501")
SOCIAL_MCP_URL = os.environ.get("SOCIAL_MCP_URL", "http://social-mcp:8502")
JOURNEY_MCP_URL = os.environ.get("JOURNEY_MCP_URL", "http://journey-mcp:8503")
VIDEO_MCP_URL = os.environ.get("VIDEO_MCP_URL", "http://video-mcp:8504")
OPENAI_JOURNEY_MCP_URL = os.environ.get("OPENAI_JOURNEY_MCP_URL", "http://openai-journey-mcp:8505")
# Claude4 Journey Mapper removed

# Initialize Anthropic client
anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

# Models
class Message(BaseModel):
    role: str = Field(..., description="Message role (user, assistant)")
    content: str = Field(..., description="Message content")

class ToolCall(BaseModel):
    name: str = Field(..., description="Tool name")
    parameters: Dict[str, Any] = Field({}, description="Tool parameters")

class Conversation(BaseModel):
    id: str
    messages: List[Message] = Field([], description="Conversation messages")
    active_tools: List[Dict[str, Any]] = Field([], description="Active tools in this conversation")
    file_mappings: Dict[str, str] = Field({}, description="Map file IDs to temporary file paths")
    journey_mappings: Dict[str, str] = Field({}, description="Map file IDs to journey IDs for tracking journey generation")

# Create FastAPI app
app = FastAPI(
    title="Agent Orchestrator Service",
    description="Orchestrates the interaction between Claude and MCP tool services",
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

# In-memory storage for conversations
conversations: Dict[str, Conversation] = {}

# In-memory storage for file uploads
uploaded_files: Dict[str, str] = {}

# Tool definitions - will be populated from services
tool_definitions: Dict[str, Dict[str, Any]] = {}

# Tool service URLs
tool_services = {
    "reddit": REDDIT_MCP_URL,
    "social": SOCIAL_MCP_URL, 
    "journey": JOURNEY_MCP_URL,
    "video": VIDEO_MCP_URL,
    "openai_journey": OPENAI_JOURNEY_MCP_URL,
    "research": os.getenv("RESEARCH_MCP_URL", "http://research-mcp:8507")
}

# Cache the available tools from each service
async def fetch_and_cache_tools():
    """Fetch tool definitions from all services and cache them using JSON-RPC 2.0"""
    global tool_definitions
    
    # Clear existing tool definitions
    tool_definitions = {}
    
    logger.info("Starting tool discovery from MCP services using JSON-RPC 2.0...")
    
    for service_name, service_url in tool_services.items():
        try:
            logger.info(f"Fetching tools from {service_name} at {service_url}/mcp")
            
            # Add retry mechanism for service connections
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Try JSON-RPC 2.0 format first
                    jsonrpc_request = {
                        "jsonrpc": "2.0",
                        "id": f"tools_list_{service_name}_{attempt}",
                        "method": "tools/list",
                        "params": {}
                    }
                    
                    response = requests.post(
                        f"{service_url}/mcp",
                        json=jsonrpc_request,
                        headers={"Content-Type": "application/json"},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        
                        # Check if it's a valid JSON-RPC response
                        if result.get("jsonrpc") == "2.0" and "result" in result:
                            tools = result["result"].get("tools", [])
                            logger.info(f"✓ Successfully fetched {len(tools)} tools from {service_name} via JSON-RPC 2.0")
                            
                            for tool in tools:
                                tool_name = tool.get("name")
                                if tool_name:
                                    tool_definitions[tool_name] = {
                                        "service": service_name,
                                        "url": f"{service_url}/mcp",  # Use main MCP endpoint
                                        "spec": tool
                                    }
                                    logger.info(f"✓ Cached tool: {tool_name}")
                                else:
                                    logger.warning(f"Tool missing 'name' field: {tool}")
                            
                            break  # Success, exit retry loop
                        else:
                            logger.warning(f"Invalid JSON-RPC response from {service_name}: {result}")
                    
                    # Fallback to legacy format if JSON-RPC fails
                    elif response.status_code == 404 or response.status_code == 422:
                        logger.info(f"JSON-RPC not supported by {service_name}, trying legacy format...")
                        
                        legacy_response = requests.get(f"{service_url}/mcp/tools", timeout=10)
                        
                        if legacy_response.status_code == 200:
                            tools = legacy_response.json()
                            logger.info(f"✓ Successfully fetched {len(tools)} tools from {service_name} via legacy format")
                            
                            for tool in tools:
                                tool_name = tool.get("name")
                                if tool_name:
                                    tool_definitions[tool_name] = {
                                        "service": service_name,
                                        "url": f"{service_url}/mcp/invoke/{tool_name}",  # Legacy URL
                                        "spec": tool,
                                        "legacy": True  # Mark as legacy
                                    }
                                    logger.info(f"✓ Cached legacy tool: {tool_name}")
                                else:
                                    logger.warning(f"Tool missing 'name' field: {tool}")
                            
                            break  # Success, exit retry loop
                        else:
                            logger.warning(f"Legacy endpoint also failed for {service_name}: HTTP {legacy_response.status_code}")
                    else:
                        logger.warning(f"Failed to fetch tools from {service_name}: HTTP {response.status_code}")
                        if attempt < max_retries - 1:
                            logger.info(f"Retrying {service_name} in 2 seconds... (attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(2)
                        
                except requests.exceptions.ConnectTimeout:
                    logger.warning(f"Connection timeout to {service_name} (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2)
                except requests.exceptions.ConnectionError as e:
                    logger.warning(f"Connection failed to {service_name}: {str(e)} (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2)
                except Exception as e:
                    logger.error(f"Unexpected error connecting to {service_name}: {str(e)}")
                    break  # Don't retry for unexpected errors
                    
        except Exception as e:
            logger.error(f"Error fetching tools from {service_name}: {str(e)}")
    
    logger.info(f"🎯 Tool discovery complete! Total tools cached: {len(tool_definitions)}")
    
    if tool_definitions:
        logger.info(f"📋 Available tools: {', '.join(sorted(tool_definitions.keys()))}")
        
        # Group tools by service for summary
        service_summary = {}
        for tool_name, tool_info in tool_definitions.items():
            service = tool_info["service"]
            is_legacy = tool_info.get("legacy", False)
            if service not in service_summary:
                service_summary[service] = {"tools": [], "legacy": 0, "jsonrpc": 0}
            service_summary[service]["tools"].append(tool_name)
            if is_legacy:
                service_summary[service]["legacy"] += 1
            else:
                service_summary[service]["jsonrpc"] += 1
        
        for service, info in service_summary.items():
            tools_list = ', '.join(info["tools"])
            legacy_count = info["legacy"]
            jsonrpc_count = info["jsonrpc"]
            logger.info(f"  📦 {service}: {tools_list} (JSON-RPC: {jsonrpc_count}, Legacy: {legacy_count})")
    else:
        logger.error("❌ No tools were successfully cached! Check MCP service availability.")
    
    return tool_definitions

# Create system message with tool definitions
def create_system_message() -> str:
    """Create a system message that includes the available tools"""
    tools_description = "You are a helpful assistant with access to the following tools:\n\n"

    # Build message with tool descriptions and parameter details
    for tool_name, tool_info in tool_definitions.items():
        tool_spec = tool_info.get("spec", {})

        # Add tool name and description
        tools_description += f"## {tool_name}\n"
        tools_description += f"{tool_spec.get('description', 'No description provided')}\n\n"

        # Add parameters section
        tools_description += "Parameters:\n"
        for param_name, param_info in tool_spec.get("parameters", {}).items():
            param_type = param_info.get("type", "unknown")
            param_desc = param_info.get("description", "No description")
            param_default = f" (default: {param_info.get('default')})" if "default" in param_info else ""

            tools_description += f"- {param_name}: {param_type} - {param_desc}{param_default}\n"

        tools_description += "\n"

    # Add instructions for how Claude should use the tools
    system_prompt = f"""You are the Customer Experience Workbench Assistant for NXT Humans, helping users analyze customer experiences using our specialized tools. You are extremely knowledgeable about customer experience analysis, social listening, and journey mapping.

Your primary tools are:

1. Reddit Data Collector (reddit_*) - Scrapes and analyzes posts from Reddit
2. Social Research Tool (social_*) - Performs topic modeling and sentiment analysis on social data  
3. Journey Mapper (journey_*) - Creates customer journey maps using Claude Opus 4.5
4. OpenAI Journey Mapper (openai_journey_*) - Advanced journey mapping using OpenAI o3 reasoning models
5. Video Transcriptor (video_*) - Transcribes and analyzes video content from URLs or uploads

Here are all the available tools you can use:

{tools_description}

To use a tool, you MUST respond in this exact format:
```json
{{
  "tool_calls": [
    {{
      "name": "tool.name",
      "parameters": {{
        "param1": "value1",
        "param2": "value2"
      }}
    }}
  ]
}}
```

IMPORTANT USAGE GUIDELINES:

1. For Reddit Analysis:
   - Start with `reddit_search` to fetch posts with specific parameters
   - Use `reddit_get_status` to check progress
   - Use `reddit_get_results` when complete

2. For Social Research:
   - Use `social_search` for basic querying
   - Use `social_topic_model` for topic analysis
   - Use `social_sentiment_analysis` for sentiment analysis
   - Always check status with corresponding get_status tools

3. For Journey Mapping:
   - Tell users to upload their files when needed
   - Use `journey_upload_file` to process uploads
   - Use `journey_generate_map` to create journey maps
   - Provide visualization links from `journey_get_results`
   - You have TWO journey mappers available:
     * `journey_*` - Claude Opus 4.5 (most advanced)
     * `openai_journey_*` - OpenAI o3 (advanced reasoning)

4. For Video Transcription:
   - Use `video_transcribe_youtube` with URL parameter for YouTube videos
   - Use `video_get_job_status` to check transcription progress
   - Use `video_get_transcript` when transcription is complete
   - Support both YouTube URLs and direct video file uploads

SPECIFIC EXAMPLES:

For Reddit data collection:
1. When a user asks to "get posts from the NBA subreddit", use:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "reddit_search",
         "parameters": {{
           "subreddit": "nba",
           "time_filter": "week",
           "limit": 25,
           "comments_per_post": 10
         }}
       }}
     ]
   }}
   ```

For social media analysis:
1. When a user asks to "analyze sentiment about iPhone", use:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "social_sentiment_analysis",
         "parameters": {{
           "search_query": "iPhone",
           "data_source": "reddit",
           "sentiment_type": "roberta"
         }}
       }}
     ]
   }}
   ```

For video transcription:
1. When a user asks to "transcribe this YouTube video: https://www.youtube.com/watch?v=abc123", use:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "video_transcribe_youtube",
         "parameters": {{
           "url": "https://www.youtube.com/watch?v=abc123"
         }}
       }}
     ]
   }}
   ```

For journey mapping (choose the appropriate mapper based on complexity):
1. For Claude Opus 4.5 journey mapping from uploaded file:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "journey_upload_file",
         "parameters": {{
           "file": "file_id_from_upload"
         }}
       }}
     ]
   }}
   ```

IMPORTANT: You DO have video transcription tools available! Never tell users you don't have video tools.
You have multiple journey mappers - always mention all three options and their strengths.

Remember to explain what you're doing when using tools, and wait for tool results before proceeding.
Always speak in a professional, helpful tone and focus on addressing the user's specific needs.
"""

    return system_prompt

# Global system message for use in API calls
system_message = create_system_message()

# Initialize a conversation
async def initialize_conversation(conversation_id: str):
    """Initialize a new conversation"""
    # Fetch tools if not already cached
    if not tool_definitions:
        await fetch_and_cache_tools()
    
    conversations[conversation_id] = Conversation(
        id=conversation_id,
        messages=[],  # Initialize with empty messages list
        active_tools=list(tool_definitions.values()),
        file_mappings={}
    )
    
    return conversations[conversation_id]

# Parse Claude's response for tool calls
def parse_tool_calls(response: str) -> List[ToolCall]:
    """Parse Claude's response for tool calls"""
    # Try to extract JSON block with tool calls
    tool_calls = []
    
    # Look for JSON blocks
    try:
        # Check if there's a JSON block in the response
        if "```json" in response:
            json_block = response.split("```json")[1].split("```")[0].strip()
            data = json.loads(json_block)
            
            if "tool_calls" in data and isinstance(data["tool_calls"], list):
                for tool_call in data["tool_calls"]:
                    if "name" in tool_call and "parameters" in tool_call:
                        tool_calls.append(ToolCall(
                            name=tool_call["name"],
                            parameters=tool_call["parameters"]
                        ))
        # Alternate format might be just a JSON object
        elif response.strip().startswith("{") and response.strip().endswith("}"):
            data = json.loads(response.strip())
            
            if "tool_calls" in data and isinstance(data["tool_calls"], list):
                for tool_call in data["tool_calls"]:
                    if "name" in tool_call and "parameters" in tool_call:
                        tool_calls.append(ToolCall(
                            name=tool_call["name"],
                            parameters=tool_call["parameters"]
                        ))
    except Exception as e:
        logger.warning(f"Error parsing tool calls from response: {str(e)}")
    
    return tool_calls

# Execute a tool call
async def execute_tool_call(tool_call: ToolCall, conversation_id: str) -> Dict[str, Any]:
    """Execute a tool call using JSON-RPC 2.0 or legacy format"""
    tool_name = tool_call.name
    parameters = tool_call.parameters
    
    # Check if tool exists
    if tool_name not in tool_definitions:
        logger.warning(f"Tool {tool_name} not found in definitions")
        return {
            "error": f"Tool '{tool_name}' not found",
            "status": "error"
        }
    
    tool_info = tool_definitions[tool_name]
    tool_url = tool_info["url"]
    is_legacy = tool_info.get("legacy", False)
    
    # Handle file parameters if any
    file_data = None
    file_param_name = None
    
    for param_name, param_value in list(parameters.items()):
        # Get parameter info from either legacy format or JSON-RPC inputSchema
        param_info = {}
        tool_spec = tool_info.get("spec", {})
        
        # Try legacy format first
        if "parameters" in tool_spec:
            param_info = tool_spec.get("parameters", {}).get(param_name, {})
        # Try JSON-RPC inputSchema format
        elif "inputSchema" in tool_spec and "properties" in tool_spec["inputSchema"]:
            param_info = tool_spec["inputSchema"]["properties"].get(param_name, {})
        
        # If parameter is a file and the value is a file_id
        if param_info.get("type") == "file" and isinstance(param_value, str):
            file_id = param_value
            file_path = conversations[conversation_id].file_mappings.get(file_id)
            
            if file_path and os.path.exists(file_path):
                # Load file for sending
                with open(file_path, "rb") as f:
                    file_data = f.read()
                file_param_name = param_name
                file_name = os.path.basename(file_path)
                
                # Remove from parameters as we'll send it separately
                parameters.pop(param_name)
                break
        
        # Also check for file_id parameters that reference uploaded files
        elif param_name == "file_id" and isinstance(param_value, str):
            file_path = conversations[conversation_id].file_mappings.get(param_value)
            
            if file_path and os.path.exists(file_path):
                # Load file for sending as a "file" parameter for legacy endpoints
                with open(file_path, "rb") as f:
                    file_data = f.read()
                file_param_name = "file"  # Legacy endpoints expect "file" parameter name
                file_name = os.path.basename(file_path)
                
                # Keep file_id in parameters for the service to track it
                # Don't remove it since the service needs it for caching
                break
    
    # Handle journey status and results tools that need journey_id instead of file_id
    if tool_name.endswith(("_get_status", "_get_results")) and "file_id" in parameters:
        file_id = parameters["file_id"]
        journey_id = conversations[conversation_id].journey_mappings.get(file_id)
        
        if journey_id:
            # Replace file_id with journey_id for status/results calls
            parameters["journey_id"] = journey_id
            parameters.pop("file_id")
            logger.info(f"Converted file_id={file_id} to journey_id={journey_id} for tool {tool_name}")
        else:
            logger.warning(f"No journey_id found for file_id={file_id} in tool {tool_name}")
    
    # Handle journey_id parameters directly (user might have provided journey_id)
    elif "journey_id" in parameters and tool_name.endswith(("_get_status", "_get_results")):
        logger.info(f"Using provided journey_id for tool {tool_name}")
    
    try:
        if is_legacy:
            # Use legacy form data format
            logger.info(f"Executing tool {tool_name} using legacy format")
            
            if file_data and file_param_name:
                # If we have file data, send as multipart/form-data
                files = {file_param_name: (file_name, file_data, "application/octet-stream")}
                
                # Convert all parameters to form fields
                form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v) 
                             for k, v in parameters.items()}
                
                response = requests.post(tool_url, files=files, data=form_data, timeout=1800)
            else:
                # Otherwise, send as form data
                form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v) 
                             for k, v in parameters.items()}
                
                response = requests.post(tool_url, data=form_data, timeout=1800)
        else:
            # Use JSON-RPC 2.0 format
            logger.info(f"Executing tool {tool_name} using JSON-RPC 2.0 format")
            
            # Create JSON-RPC request
            request_id = f"tool_call_{tool_name}_{uuid.uuid4().hex[:8]}"
            jsonrpc_request = {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": parameters
                }
            }
            
            # Handle file uploads for JSON-RPC (if needed)
            if file_data and file_param_name:
                # For JSON-RPC with files, we need to handle this differently
                # For now, we'll fallback to legacy format
                logger.warning(f"File upload not yet supported in JSON-RPC format for {tool_name}, using legacy format")
                
                files = {file_param_name: (file_name, file_data, "application/octet-stream")}
                form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v) 
                             for k, v in parameters.items()}
                
                # Use legacy endpoint for file uploads
                legacy_url = tool_url.replace("/mcp", f"/mcp/invoke/{tool_name}")
                response = requests.post(legacy_url, files=files, data=form_data, timeout=1800)
            else:
                # Send JSON-RPC request
                response = requests.post(
                    tool_url,
                    json=jsonrpc_request,
                    headers={"Content-Type": "application/json"},
                    timeout=1800
                )
        
        if response.status_code == 200:
            result = response.json()
            
            # Handle JSON-RPC response format
            if not is_legacy and result.get("jsonrpc") == "2.0":
                if result.get("error") is not None:
                    # Handle JSON-RPC error response
                    error_info = result["error"]
                    logger.error(f"JSON-RPC error from {tool_name}: {error_info}")
                    return {
                        "error": error_info.get("message", "Unknown JSON-RPC error") if isinstance(error_info, dict) else str(error_info),
                        "status": "error",
                        "error_code": error_info.get("code") if isinstance(error_info, dict) else None
                    }
                elif "result" in result:
                    # Handle successful JSON-RPC response
                    return result["result"]
                else:
                    logger.warning(f"Invalid JSON-RPC response from {tool_name}: {result}")
                    return {
                        "error": "Invalid JSON-RPC response format - missing both result and error",
                        "status": "error"
                    }
            else:
                # Legacy response format
                return result
        else:
            logger.error(f"Error executing tool {tool_name}: HTTP {response.status_code} - {response.text}")
            return {
                "error": f"Error executing tool '{tool_name}': HTTP {response.status_code} - {response.text}",
                "status": "error",
                "status_code": response.status_code
            }
            
    except Exception as e:
        logger.exception(f"Error executing tool {tool_name}")
        return {
            "error": f"Error executing tool '{tool_name}': {str(e)}",
            "status": "error"
        }

# Format tool results for Claude
def format_tool_results(tool_call: ToolCall, results: Dict[str, Any]) -> str:
    """Format tool results for Claude"""
    return f"""Tool: {tool_call.name}
Parameters: {json.dumps(tool_call.parameters, indent=2)}
Results: {json.dumps(results, indent=2)}
"""

# Process user message with Claude
async def process_message(conversation_id: str, user_message: str, uploaded_file_id: Optional[str] = None) -> str:
    """Process a user message with Claude and invoke tools as needed"""
    # Get or initialize conversation
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
    
    conversation = conversations[conversation_id]
    
    # Add user message to conversation
    conversation.messages.append(Message(role="user", content=user_message))
    
    # If there's an uploaded file, add information about it
    if uploaded_file_id:
        file_path = uploaded_files.get(uploaded_file_id)
        if file_path:
            # Add file to conversation file mappings
            conversation.file_mappings[uploaded_file_id] = file_path
            
            # Add a message about the uploaded file
            file_name = os.path.basename(file_path)
            conversation.messages.append(Message(
                role="user",
                content=f"User uploaded a file: {file_name} (ID: {uploaded_file_id}). You can use this file_id in tool calls that accept files."
            ))
    
    # Format messages for Claude
    claude_messages = []
    for msg in conversation.messages:
        claude_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Get response from Claude
    response = await anthropic_client.messages.create(
        model=ANTHROPIC_MODEL,
        system=system_message,  # Use top-level system parameter
        messages=claude_messages,
        max_tokens=1024
    )
    
    assistant_response = response.content[0].text
    
    # Check if Claude wants to call a tool
    tool_calls = parse_tool_calls(assistant_response)
    
    if tool_calls:
        # Claude wants to use tools
        original_response = assistant_response
        
        # Extract just the text before the JSON if any
        if "```json" in original_response:
            explanation = original_response.split("```json")[0].strip()
        elif original_response.strip().startswith("{"):
            explanation = "I'll help you with that by using the appropriate tools:"
        else:
            explanation = original_response
        
        # Add Claude's explanation to conversation
        conversation.messages.append(Message(role="assistant", content=explanation))
        
        # Execute each tool call
        for tool_call in tool_calls:
            # Log the tool call
            logger.info(f"Executing tool call: {tool_call.name}")
            
            # Add tool call to conversation
            tool_call_msg = f"I'll use the {tool_call.name} tool with parameters: {json.dumps(tool_call.parameters, indent=2)}"
            conversation.messages.append(Message(role="assistant", content=tool_call_msg))
            
            # Execute tool call
            tool_results = await execute_tool_call(tool_call, conversation_id)
            
            # Track journey IDs for journey generation tools
            if tool_call.name.endswith("_generate_map") and "journey_id" in tool_results:
                journey_id = tool_results["journey_id"]
                file_id = tool_call.parameters.get("file_id")
                if file_id and journey_id:
                    conversation.journey_mappings[file_id] = journey_id
                    logger.info(f"Tracking journey mapping: file_id={file_id} -> journey_id={journey_id}")
            
            # Format results for Claude
            formatted_results = format_tool_results(tool_call, tool_results)
            
            # Add tool results to conversation
            conversation.messages.append(Message(role="user", content=f"Tool Results:\n{formatted_results}"))
        
        # Ask Claude to respond with the tool results
        claude_messages = []
        for msg in conversation.messages:
            claude_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add special instruction for Claude
        claude_messages.append({
            "role": "user",
            "content": "Please provide a clear response based on the tool results above. Do not use any more tools in this response."
        })
        
        # Get final response from Claude
        final_response = await anthropic_client.messages.create(
            model=ANTHROPIC_MODEL,
            system=system_message,  # Use top-level system parameter
            messages=claude_messages,
            max_tokens=1024
        )
        
        final_assistant_response = final_response.content[0].text
        
        # Add final response to conversation
        conversation.messages.append(Message(role="assistant", content=final_assistant_response))
        
        return final_assistant_response
    else:
        # No tool calls, just add Claude's response to conversation
        conversation.messages.append(Message(role="assistant", content=assistant_response))
        return assistant_response

# API Endpoints
@app.post("/api/chat/conversation")
async def create_conversation():
    """Create a new conversation"""
    conversation_id = str(uuid.uuid4())
    await initialize_conversation(conversation_id)
    return {"conversation_id": conversation_id}

@app.post("/api/chat/message")
async def send_message(
    conversation_id: str = Form(...),
    message: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    """Send a message to the agent"""
    file_id = None
    
    # Handle file upload if present
    if file:
        # Save file to temporary location
        file_id = str(uuid.uuid4())
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, f"{file_id}_{file.filename}")
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Store file path
        uploaded_files[file_id] = file_path
    
    # Process message
    response = await process_message(conversation_id, message, file_id)
    
    return {"reply": response}

@app.get("/api/chat/ws/{conversation_id}")
async def websocket_endpoint_info(conversation_id: str):
    """Return WebSocket endpoint information"""
    return {"ws_url": f"/ws/{conversation_id}"}

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    
    # Initialize conversation if needed
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
        
    # Send initial welcome message
    logger.info(f"Sending welcome message to conversation {conversation_id}")
    try:
        await websocket.send_json({
            "type": "message",
            "content": "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
        })
    except Exception as e:
        logger.error(f"Error sending welcome message: {str(e)}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type", "")
            
            if message_type == "message":
                # Regular text message
                user_message = data.get("content", "")
                
                # Process with Claude (use empty string if message is None)
                response = await process_message(conversation_id, user_message or "")
                
                # Send response back to client
                await websocket.send_json({
                    "type": "message",
                    "content": response
                })
                
            elif message_type == "file":
                # File upload message
                file_data_base64 = data.get("file", {}).get("data", "")
                file_name = data.get("file", {}).get("name", "unnamed_file")
                message_text = data.get("content", "")
                
                if file_data_base64:
                    # Decode file data
                    try:
                        file_data = base64.b64decode(file_data_base64)
                        
                        # Save file to temporary location
                        file_id = str(uuid.uuid4())
                        temp_dir = tempfile.gettempdir()
                        file_path = os.path.join(temp_dir, f"{file_id}_{file_name}")
                        
                        with open(file_path, "wb") as f:
                            f.write(file_data)
                        
                        # Store file path
                        uploaded_files[file_id] = file_path
                        
                        # Process message with Claude
                        response = await process_message(conversation_id, message_text or "", file_id)
                        
                        # Send response back to client
                        await websocket.send_json({
                            "type": "message",
                            "content": response
                        })
                        
                    except Exception as e:
                        logger.exception("Error processing file upload")
                        await websocket.send_json({
                            "type": "error",
                            "content": f"Error processing file upload: {str(e)}"
                        })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "content": "No file data provided"
                    })
            
            elif message_type == "ping":
                # Ping message to keep connection alive
                await websocket.send_json({"type": "pong"})
            
            else:
                # Unknown message type
                await websocket.send_json({
                    "type": "error",
                    "content": f"Unknown message type: {message_type}"
                })
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {conversation_id}")
    except ConnectionClosedError:
        logger.info(f"WebSocket connection closed: {conversation_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "content": f"Server error: {str(e)}"
            })
        except:
            pass

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "agent-orchestrator",
        "model": ANTHROPIC_MODEL,
        "tools_cached": len(tool_definitions),
        "available_tools": list(tool_definitions.keys()),
        "active_conversations": len(conversations)
    }

# Refresh tools endpoint
@app.post("/refresh-tools")
async def refresh_tools():
    """Force refresh tool definitions"""
    global tool_definitions, system_message
    
    # Clear existing tool definitions
    tool_definitions = {}
    
    # Fetch and cache tools again
    await fetch_and_cache_tools()
    
    # Update system message with new tool definitions
    system_message = create_system_message()
    
    return {
        "status": "success",
        "message": "Tool definitions refreshed",
        "tools": list(tool_definitions.keys())
    }

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Agent Orchestrator Service",
        "version": "1.0.0",
        "status": "running",
        "model": ANTHROPIC_MODEL,
        "endpoints": {
            "/api/chat/conversation": "Create a new conversation",
            "/api/chat/message": "Send a message to the agent",
            "/api/chat/ws/{conversation_id}": "Get WebSocket endpoint info",
            "/ws/{conversation_id}": "WebSocket endpoint for real-time chat",
            "/refresh-tools": "Force refresh tool definitions"
        }
    }

@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    # Fetch and cache tools
    await fetch_and_cache_tools()
    logger.info(f"Cached {len(tool_definitions)} tool definitions")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8500))
    uvicorn.run(app, host="0.0.0.0", port=port)