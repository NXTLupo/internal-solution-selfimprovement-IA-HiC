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
from openai import AsyncOpenAI
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
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

if not ANTHROPIC_API_KEY:
    logger.warning("ANTHROPIC_API_KEY environment variable not set - Claude models will not be available")

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY environment variable not set - OpenAI models will not be available")

if not ANTHROPIC_API_KEY and not OPENAI_API_KEY:
    logger.error("Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set")
    raise ValueError("At least one API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) must be set")

# Default models
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

REDDIT_MCP_URL = os.environ.get("REDDIT_MCP_URL", "http://reddit-mcp:8501")
SOCIAL_MCP_URL = os.environ.get("SOCIAL_MCP_URL", "http://social-mcp:8502")
JOURNEY_MCP_URL = os.environ.get("JOURNEY_MCP_URL", "http://journey-mcp:8503")
VIDEO_MCP_URL = os.environ.get("VIDEO_MCP_URL", "http://video-mcp:8504")
OPENAI_JOURNEY_MCP_URL = os.environ.get("OPENAI_JOURNEY_MCP_URL", "http://openai-journey-mcp:8505")
CLAUDE4_JOURNEY_MCP_URL = os.environ.get("CLAUDE4_JOURNEY_MCP_URL", "http://claude4-journey-mcp:8506")

# Initialize AI clients
anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Available models
CLAUDE_MODELS = [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022", 
    "claude-3-haiku-20240307",
    "claude-sonnet-4-20250514"
]

OPENAI_MODELS = [
    "gpt-4o",
    "gpt-4o-mini", 
    "gpt-4",
    "gpt-3.5-turbo",
    "o1",
    "o1-mini",
    "o1-preview"
]

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
    current_model: str = Field(ANTHROPIC_MODEL if ANTHROPIC_API_KEY else OPENAI_MODEL, description="Current AI model")
    mode: str = Field("agent", description="Mode: 'agent' (with tools) or 'chat' (general purpose LLM)")

class ModelRequest(BaseModel):
    conversation_id: str
    model: str
    mode: Optional[str] = "agent"

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
    "claude4_journey": CLAUDE4_JOURNEY_MCP_URL
}

# Cache the available tools from each service
async def fetch_and_cache_tools():
    """Fetch tool definitions from all services and cache them"""
    global tool_definitions
    
    # Clear existing tool definitions
    tool_definitions = {}
    
    logger.info("Starting tool discovery from MCP services...")
    
    for service_name, service_url in tool_services.items():
        try:
            logger.info(f"Fetching tools from {service_name} at {service_url}/mcp/tools")
            
            # Add retry mechanism for service connections
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.get(f"{service_url}/mcp/tools", timeout=10)
                    
                    if response.status_code == 200:
                        tools = response.json()
                        logger.info(f"Successfully fetched {len(tools)} tools from {service_name}")
                        
                        for tool in tools:
                            tool_name = tool.get("name")
                            if tool_name:
                                tool_definitions[tool_name] = {
                                    "service": service_name,
                                    "url": f"{service_url}/mcp/invoke/{tool_name}",
                                    "spec": tool
                                }
                                logger.info(f"✓ Cached tool: {tool_name}")
                            else:
                                logger.warning(f"Tool missing 'name' field: {tool}")
                        
                        logger.info(f"✓ Successfully added {len(tools)} tools from {service_name}")
                        break  # Success, exit retry loop
                        
                    elif response.status_code == 404:
                        logger.warning(f"Service {service_name} doesn't have /mcp/tools endpoint")
                        break  # Don't retry for 404
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
            if service not in service_summary:
                service_summary[service] = []
            service_summary[service].append(tool_name)
        
        for service, tools in service_summary.items():
            logger.info(f"  📦 {service}: {', '.join(tools)}")
    else:
        logger.error("❌ No tools were successfully cached! Check MCP service availability.")
    
    return tool_definitions

# Create system message with tool definitions
def create_system_message(mode: str = "agent", active_features: List[str] = None) -> str:
    """Create a system message based on the mode (agent or chat) and active features"""
    
    if active_features is None:
        active_features = []
    
    if mode == "chat":
        # Enhanced chat mode with advanced features
        base_message = """You are a highly capable AI assistant created by NXT Humans, an AI-Native Consultancy and Agency. You can help with a wide variety of tasks including:

- General conversation and questions
- Writing and content creation
- Analysis and research
- Problem-solving and brainstorming
- Technical explanations
- Creative tasks
- Code assistance
- Business strategy and consulting insights
- And much more

You are knowledgeable, helpful, and can engage in both casual conversations and deep technical discussions. When appropriate, you can leverage your understanding of AI, digital transformation, and business strategy given your association with NXT Humans.

**IMPORTANT**: You are running on a Claude model which supports REAL web search when the web search feature is enabled. Use this capability to provide current, accurate information."""

        # Add advanced capabilities based on active features
        if active_features:
            advanced_capabilities = []
            
            if "web-search" in active_features:
                advanced_capabilities.append("""
**WEB SEARCH ENABLED**: You have REAL web search capability! You can search the internet for current information, news, research, and real-time data. When users ask about current events, recent developments, or need up-to-date information, use the web search tool to provide accurate, up-to-date responses with proper citations.""")
            
            if "code-execution" in active_features:
                advanced_capabilities.append("""
**CODE EXECUTION ENABLED**: You can write and execute Python code to perform calculations, data analysis, create visualizations, test algorithms, and solve computational problems. Offer to run code when it would be helpful.""")
            
            if "file-analysis" in active_features:
                advanced_capabilities.append("""
**ADVANCED FILE ANALYSIS ENABLED**: You can deeply analyze uploaded files including documents, spreadsheets, images, code files, and more. Provide comprehensive insights, summaries, and recommendations based on file contents.""")
            
            if "deep-research" in active_features:
                advanced_capabilities.append("""
**DEEP RESEARCH ENABLED**: You can conduct thorough, multi-step research on complex topics, synthesizing information from multiple sources and providing comprehensive analysis with citations and references.""")
            
            if advanced_capabilities:
                base_message += "\n\n**ADVANCED CAPABILITIES ACTIVE:**" + "".join(advanced_capabilities)
        
        base_message += "\n\nRespond naturally and helpfully to whatever the user needs assistance with."
        
        # Store active features for use in chat mode tool selection
        if not hasattr(create_system_message, '_chat_mode_features'):
            create_system_message._chat_mode_features = {}
        create_system_message._chat_mode_features['web-search'] = "web-search" in active_features
        
        return base_message

    # Agent mode with tools
    tools_description = "You have access to the following specialized tools:\n\n"

    # Build message with tool descriptions and parameter details
    for tool_name, tool_info in tool_definitions.items():
        tool_spec = tool_info.get("spec", {})

        # Add tool name and description
        tools_description += f"## {tool_name}\n"
        tools_description += f"{tool_spec.get('description', 'No description provided')}\n\n"

        # Add parameters section
        tools_description += "Parameters:\n"
        for param_name, param_info in tool_spec.get("parameters", {}).items():
            # Handle case where param_info might be a string instead of dict
            if isinstance(param_info, dict):
                param_type = param_info.get("type", "unknown")
                param_desc = param_info.get("description", "No description")
                param_default = f" (default: {param_info.get('default')})" if "default" in param_info else ""
            else:
                # If param_info is not a dict, treat it as the type
                param_type = str(param_info)
                param_desc = "No description"
                param_default = ""

            tools_description += f"- {param_name}: {param_type} - {param_desc}{param_default}\n"

        tools_description += "\n"

    # Add instructions for how the AI should use the tools
    system_prompt = f"""You are the Customer Experience Workbench Assistant for NXT Humans, helping users analyze customer experiences using our specialized tools. You are extremely knowledgeable about customer experience analysis, social listening, and journey mapping.

Your primary tools are:

1. Reddit Data Collector (reddit_*) - Scrapes and analyzes posts from Reddit
2. Social Research Tool (social_*) - Performs topic modeling and sentiment analysis on social data  
3. Journey Mapper (journey_*) - Creates customer journey maps using Claude 3.7 Sonnet
4. OpenAI Journey Mapper (openai_journey_*) - Advanced journey mapping using OpenAI o3 reasoning models
5. Claude 4 Journey Mapper (claude4_journey_*) - Most advanced journey mapping using Claude 4
6. Video Transcriptor (video_*) - Transcribes and analyzes video content from URLs or uploads

Here are all the available tools you can use:

{tools_description}

**CRITICAL TOOL USAGE INSTRUCTIONS:**

When you need to use tools to help the user, you must ONLY indicate your intent to use tools by including a JSON block in your response. The tools will be executed automatically, and you should then provide a natural response based on the results.

To use a tool, include this exact format in your response:
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

IMPORTANT: Never show JSON tool calls to users as part of your conversational response. Use tools naturally and describe what you're doing in plain language, like:
- "Let me retrieve that video transcript for you..."
- "I'll search for Reddit posts about that topic..."
- "I'll analyze the sentiment of that data..."

The JSON tool calls are for internal execution only and should not be part of your conversational response to users.

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
   - **CRITICAL**: Journey mapping MUST use this exact two-step process:
   
   **STEP 1 - ALWAYS REQUIRED**: First call journey_upload_file with the user's uploaded file
   **STEP 2 - ONLY AFTER STEP 1**: Then call journey_generate_map with the file_id returned from step 1
   
   Example workflow:
   - User uploads file with ID "abc123"
   - Call journey_upload_file with file_id "abc123" -> returns journey_file_id "xyz789"  
   - Call journey_generate_map with file_id "xyz789"
   
   - **NEVER skip step 1** - always upload the file to the journey service first
   - **NEVER use the user's original file_id** directly in journey_generate_map
   - Journey mapping takes 15-20 minutes for comprehensive analysis
   - You have THREE journey mappers available (all require the same two-step process):
     * journey_upload_file + journey_generate_map (Claude 3.7 Sonnet)
     * openai_journey_upload_file + openai_journey_generate_map (OpenAI o3)  
     * claude4_journey_upload_file + claude4_journey_generate_map (Claude 4)

4. For Video Transcription:
   - Use `video_transcribe_youtube` with youtube_url parameter for YouTube videos
   - Use `video_get_job_status` to check transcription progress
   - Use `video_get_transcript` when transcription is complete
   - Support both YouTube URLs and direct video file uploads

IMPORTANT NOTE: There is currently NO LinkedIn Generator tool available. If users ask to process files with LinkedIn Generator, explain that the LinkedIn Generator runs as a standalone service (port 5003) and suggest they use the Journey Mapper tools instead for analysis.

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
           "youtube_url": "https://www.youtube.com/watch?v=abc123"
         }}
       }}
     ]
   }}
   ```

For journey mapping from uploaded files (SINGLE STEP PROCESS):
1. Generate map directly using user's file_id:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "journey_generate_map",
         "parameters": {{
           "file_id": "user_uploaded_file_id",
           "journey_name": "Blog PDF Customer Journey",
           "description": "Journey map from uploaded blog PDF"
         }}
       }}
     ]
   }}
   ```

2. Then get results using the returned journey_id:
   ```json
   {{
     "tool_calls": [
       {{
         "name": "journey_get_results",
         "parameters": {{
           "journey_id": "returned_journey_id_from_step_1"
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
def parse_tool_calls(response_content) -> List[ToolCall]:
    """Parse Claude's response for tool calls using official Anthropic format"""
    tool_calls = []
    
    # Handle both string and direct content array
    if isinstance(response_content, str):
        # Legacy format - try to parse JSON blocks
        try:
            if "```json" in response_content:
                json_block = response_content.split("```json")[1].split("```")[0].strip()
                data = json.loads(json_block)
                
                if "tool_calls" in data and isinstance(data["tool_calls"], list):
                    for tool_call in data["tool_calls"]:
                        if "name" in tool_call and "parameters" in tool_call:
                            tool_calls.append(ToolCall(
                                name=tool_call["name"],
                                parameters=tool_call["parameters"]
                            ))
            elif response_content.strip().startswith("{") and response_content.strip().endswith("}"):
                data = json.loads(response_content.strip())
                
                if "tool_calls" in data and isinstance(data["tool_calls"], list):
                    for tool_call in data["tool_calls"]:
                        if "name" in tool_call and "parameters" in tool_call:
                            tool_calls.append(ToolCall(
                                name=tool_call["name"],
                                parameters=tool_call["parameters"]
                            ))
        except Exception as e:
            logger.warning(f"Error parsing legacy tool calls from response: {str(e)}")
    
    elif isinstance(response_content, list):
        # Official Anthropic format - content array with tool_use blocks
        try:
            for content_block in response_content:
                if isinstance(content_block, dict) and content_block.get("type") == "tool_use":
                    tool_name = content_block.get("name")
                    tool_input = content_block.get("input", {})
                    
                    if tool_name:
                        tool_calls.append(ToolCall(
                            name=tool_name,
                            parameters=tool_input
                        ))
                        logger.info(f"Found official tool call: {tool_name} with parameters: {tool_input}")
        except Exception as e:
            logger.warning(f"Error parsing official tool calls from content array: {str(e)}")
    
    return tool_calls

# Execute a tool call
async def execute_tool_call(tool_call: ToolCall, conversation_id: str) -> Dict[str, Any]:
    """Execute a tool call and return the result"""
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
    
    # Replace any file_id parameters with actual file content if needed
    file_data = None
    file_param_name = None
    
    for param_name, param_value in list(parameters.items()):
        param_info = tool_info.get("spec", {}).get("parameters", {})
        
        # Check if this parameter expects a file
        is_file_param = False
        
        # Check for journey mapping tools with file_id parameter that needs file content
        if (param_name == "file_id" and "journey" in tool_name) or param_name == "file":
            is_file_param = True
        elif isinstance(param_info, dict) and "properties" in param_info:
            # Check nested properties
            if param_name in param_info["properties"] and param_info["properties"][param_name].get("type") == "file":
                is_file_param = True
        elif isinstance(param_info, dict) and param_name in param_info and param_info[param_name].get("type") == "file":
            is_file_param = True
            
        if is_file_param:
            # This is a file parameter - extract file_id and load file content
            file_id = None
            if isinstance(param_value, str):
                file_id = param_value
            elif isinstance(param_value, dict) and "file_id" in param_value:
                file_id = param_value["file_id"]
            
            if file_id:
                # First check conversations file mappings
                file_path = conversations[conversation_id].file_mappings.get(file_id)
                
                # Also check global uploaded_files mapping
                if not file_path:
                    file_path = uploaded_files.get(file_id)
                    if file_path:
                        # Add to conversation mappings for future reference
                        conversations[conversation_id].file_mappings[file_id] = file_path
                
                logger.info(f"Looking for file_id {file_id}. Found path: {file_path}")
                logger.info(f"Conversation mappings: {list(conversations[conversation_id].file_mappings.keys())}")
                logger.info(f"Global uploaded files: {list(uploaded_files.keys())}")
                
                if file_path and os.path.exists(file_path):
                    # Load file for sending
                    with open(file_path, "rb") as f:
                        file_data = f.read()
                    file_param_name = "file"  # Journey mapper expects "file" parameter
                    file_name = os.path.basename(file_path)
                    logger.info(f"Successfully loaded file: {file_name}, size: {len(file_data)} bytes")
                    
                    # Remove original parameter and don't add it to form data
                    parameters.pop(param_name)
                    break
                else:
                    logger.error(f"File not found for ID {file_id}. Path: {file_path}, Exists: {os.path.exists(file_path) if file_path else False}")
                    # Don't break here, continue to see if there are other file parameters
    
    try:
        # Execute tool call
        if file_data and file_param_name:
            # If we have file data, send as multipart/form-data
            files = {file_param_name: (file_name, file_data, "application/octet-stream")}
            
            # Convert all parameters to form fields
            form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v) 
                         for k, v in parameters.items()}
            
            logger.info(f"Sending file {file_name} to {tool_name} with parameters: {form_data}")
            response = requests.post(tool_url, files=files, data=form_data, timeout=1200)  # 20 minutes for journey mapping
        else:
            # Otherwise, send as form data
            form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v) 
                         for k, v in parameters.items()}
            
            logger.info(f"Sending {tool_name} request with parameters: {form_data}")
            response = requests.post(tool_url, data=form_data, timeout=1200)  # 20 minutes for comprehensive analysis
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Error executing tool {tool_name}: {response.text}")
            return {
                "error": f"Error executing tool '{tool_name}': {response.text}",
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

# Enhanced AI model call function with advanced features
async def call_ai_model(model: str, messages: List[Dict], system_message: str, max_tokens: int = 1024, active_features: List[str] = None) -> tuple:
    """Call the appropriate AI model (Claude or OpenAI) with enhanced capabilities"""
    if active_features is None:
        active_features = []
    
    try:
        if model in CLAUDE_MODELS and anthropic_client:
            # Enhanced Claude with real web search and advanced features
            enhanced_system = system_message
            
            # Prepare tools for Claude
            tools = []
            
            # Add real web search tool if web-search is active (for both agent and chat modes)
            if "web-search" in active_features:
                tools.append({
                    "type": "web_search_20250305", 
                    "name": "web_search",
                    "max_uses": 5
                })
            
            if active_features and any(feat in active_features for feat in ["web-search", "code-execution", "file-analysis", "deep-research"]):
                enhanced_system += "\n\nIMPORTANT: You have enhanced capabilities active. When responding:"
                
                if "web-search" in active_features:
                    enhanced_system += "\n- For current events, news, or real-time information: You have REAL web search capability. Use the web_search tool to find current information, news, and real-time data. Always cite your sources from the search results."
                
                if "code-execution" in active_features:
                    enhanced_system += "\n- For calculations, data analysis, or programming tasks: Note that code execution is currently simulated. You can write code examples and explain them step-by-step, but acknowledge that you cannot actually execute code in this environment."
                
                if "file-analysis" in active_features:
                    enhanced_system += "\n- For uploaded files: Provide deep, comprehensive analysis with insights, summaries, and actionable recommendations. You can read and analyze common file types including text files, PDFs (analyze content structure), images (describe contents), and code files."
                
                if "deep-research" in active_features:
                    enhanced_system += "\n- For complex topics: Conduct multi-layered analysis, consider multiple perspectives, and provide thorough research with references. Use web search to gather current information."
                
                enhanced_system += "\n\nBe proactive in offering these capabilities when relevant to the user's request."
            
            # Create the API call with or without tools
            api_params = {
                "model": model,
                "system": enhanced_system,
                "messages": messages,
                "max_tokens": max_tokens
            }
            
            if tools:
                api_params["tools"] = tools
            
            response = await anthropic_client.messages.create(**api_params)
            
            # Handle different content types in the response
            response_text = ""
            for content_block in response.content:
                if content_block.type == "text":
                    response_text += content_block.text
                elif content_block.type == "server_tool_use":
                    # Web search tool use - add explanation
                    if content_block.name == "web_search":
                        query = content_block.input.get("query", "")
                        response_text += f"\n\n🔍 **Searching the web for**: {query}\n"
                elif content_block.type == "web_search_tool_result":
                    # Web search results - add summary
                    results_count = len(content_block.content) if hasattr(content_block, 'content') else 0
                    response_text += f"\n📊 **Found {results_count} relevant sources**\n"
            
            return response_text, response
            
        elif model in OPENAI_MODELS and openai_client:
            # Enhanced OpenAI with advanced features simulation
            enhanced_system = system_message
            
            if active_features and any(feat in active_features for feat in ["web-search", "code-execution", "file-analysis", "deep-research"]):
                enhanced_system += "\n\nENHANCED CAPABILITIES ACTIVE:"
                
                if "web-search" in active_features:
                    enhanced_system += "\n- Web Search: Note that web search is currently simulated for OpenAI models. Acknowledge that you cannot actually browse the internet in real-time, but offer to help with available knowledge and suggest reliable sources. For real web search, users should switch to Claude models."
                
                if "code-execution" in active_features:
                    enhanced_system += "\n- Code Execution: Note that code execution is currently simulated. You can write code examples and explain them step-by-step, but acknowledge that you cannot actually execute code."
                
                if "file-analysis" in active_features:
                    enhanced_system += "\n- Advanced File Analysis: Provide comprehensive analysis of uploaded files with deep insights. You can read and analyze text files, PDFs, images, and code files."
                
                if "deep-research" in active_features:
                    enhanced_system += "\n- Deep Research: Conduct thorough, multi-perspective analysis on complex topics"
                
                enhanced_system += "\n\nActively suggest these capabilities when they would be helpful to the user."
            
            # Convert system message to OpenAI format
            openai_messages = [{"role": "system", "content": enhanced_system}] + messages
            
            # Handle o1 models which don't support system messages
            if model.startswith("o1"):
                # For o1 models, prepend system message to first user message
                if openai_messages[1]["role"] == "user":
                    openai_messages[1]["content"] = f"{enhanced_system}\n\n{openai_messages[1]['content']}"
                openai_messages = openai_messages[1:]  # Remove system message
                
                response = await openai_client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    max_completion_tokens=max_tokens
                )
            else:
                response = await openai_client.chat.completions.create(
                    model=model,
                    messages=openai_messages,
                    max_tokens=max_tokens
                )
            
            return response.choices[0].message.content, None
            
        else:
            raise ValueError(f"Model {model} not supported or API client not available")
            
    except Exception as e:
        logger.error(f"Error calling AI model {model}: {str(e)}")
        raise

# Process user message with AI
async def process_message(conversation_id: str, user_message: str, uploaded_file_id: Optional[str] = None, active_features: List[str] = None) -> str:
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
            logger.info(f"Processing file upload: {file_name} for conversation {conversation_id} in {conversation.mode} mode")
            
            if conversation.mode == "agent":
                conversation.messages.append(Message(
                    role="user",
                    content=f"User uploaded a file: {file_name} (ID: {uploaded_file_id}). You can use this file_id in tool calls that accept files."
                ))
            else:
                # In chat mode, provide basic file info
                conversation.messages.append(Message(
                    role="user",
                    content=f"User uploaded a file: {file_name}. Please analyze this file to the best of your ability based on the filename and content type."
                ))
    
    # Format messages for Claude
    claude_messages = []
    for msg in conversation.messages:
        claude_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Get current system message based on conversation mode and active features
    current_system_message = create_system_message(conversation.mode, active_features)
    
    # Get response from appropriate AI model
    assistant_response, claude_response = await call_ai_model(
        conversation.current_model,
        claude_messages,
        current_system_message,
        max_tokens=2048,
        active_features=active_features
    )
    
    # Check if we're in agent mode and the AI wants to call a tool
    tool_calls = []
    if conversation.mode == "agent" and claude_response:
        # Pass the original response content for official tool call parsing
        tool_calls = parse_tool_calls(claude_response.content)
    
    if tool_calls and conversation.mode == "agent":
        # Claude wants to use tools - execute them silently
        logger.info(f"Detected {len(tool_calls)} tool calls, executing silently...")
        
        # Extract only the explanatory text before JSON (if any) for user display
        explanation_text = ""
        if "```json" in assistant_response:
            explanation_text = assistant_response.split("```json")[0].strip()
        elif not assistant_response.strip().startswith("{"):
            # Response has text before JSON - use it
            explanation_text = assistant_response
        
        # If no explanation provided, create a natural one
        if not explanation_text:
            explanation_text = "Let me help you with that..."
        
        # Execute each tool call silently
        all_tool_results = []
        for tool_call in tool_calls:
            logger.info(f"Executing tool call: {tool_call.name} with parameters: {tool_call.parameters}")
            
            # Execute tool call
            tool_results = await execute_tool_call(tool_call, conversation_id)
            
            # Format results for context
            formatted_results = format_tool_results(tool_call, tool_results)
            all_tool_results.append({
                "tool_name": tool_call.name,
                "parameters": tool_call.parameters,
                "results": formatted_results
            })
            
            # Add tool execution to conversation history for context
            conversation.messages.append(Message(
                role="user", 
                content=f"[TOOL EXECUTED] {tool_call.name}: {formatted_results}"
            ))
        
        # Now ask Claude to provide a natural response based on tool results
        # Don't include the original JSON response in conversation
        updated_claude_messages = []
        for msg in conversation.messages:
            updated_claude_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add instruction for natural response
        updated_claude_messages.append({
            "role": "user",
            "content": "Based on the tool results above, please provide a clear, helpful response to the user. Present the information naturally without showing any JSON or technical details. Focus on answering the user's original request. IMPORTANT: Do not include any JSON or tool calls in your response."
        })
        
        # Get final natural language response
        final_response = await call_ai_model(
            conversation.current_model,
            updated_claude_messages,
            current_system_message,
            max_tokens=2048,
            active_features=active_features
        )
        
        # Safety check: Remove any JSON blocks from the final response
        clean_response = final_response
        if "```json" in clean_response:
            clean_response = clean_response.split("```json")[0].strip()
            if not clean_response:
                clean_response = "I've executed the requested tools and retrieved the information for you."
        
        # If response still starts with JSON, create a clean response
        if clean_response.strip().startswith("{"):
            clean_response = explanation_text if explanation_text else "I've completed the requested action using the available tools."
        
        # Add the clean response to conversation (not the JSON one)
        conversation.messages.append(Message(role="assistant", content=clean_response))
        
        return clean_response
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
    active_features: Optional[str] = Form(None),
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
        
        file_content = await file.read()
        logger.info(f"File upload received: {file.filename}, size: {len(file_content)} bytes")
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Store file path
        uploaded_files[file_id] = file_path
        logger.info(f"File saved to: {file_path} with ID: {file_id}")
    
    # Parse active features
    features_list = []
    if active_features:
        try:
            features_list = json.loads(active_features)
        except json.JSONDecodeError:
            logger.warning(f"Invalid active_features JSON: {active_features}")
    
    # Process message
    response = await process_message(conversation_id, message, file_id, features_list)
    
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
        conversation = conversations[conversation_id]
        if conversation.mode == "agent":
            welcome_msg = "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
        else:
            welcome_msg = f"Hello! I'm your AI assistant powered by {conversation.current_model}. I'm ready to help with any questions or tasks you have. What would you like to discuss?"
        
        await websocket.send_json({
            "type": "message",
            "content": welcome_msg,
            "model": conversation.current_model,
            "mode": conversation.mode
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
                    "content": response,
                    "model": conversations[conversation_id].current_model,
                    "mode": conversations[conversation_id].mode
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
                            "content": response,
                            "model": conversations[conversation_id].current_model,
                            "mode": conversations[conversation_id].mode
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
            
            elif message_type == "set_model":
                # Model/mode change request
                new_model = data.get("model", "")
                new_mode = data.get("mode", "agent")
                
                # Validate model
                if new_model not in CLAUDE_MODELS + OPENAI_MODELS:
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Model {new_model} not supported"
                    })
                    continue
                
                # Check if client for this model is available
                if new_model in CLAUDE_MODELS and not anthropic_client:
                    await websocket.send_json({
                        "type": "error",
                        "content": "Claude models not available (missing ANTHROPIC_API_KEY)"
                    })
                    continue
                
                if new_model in OPENAI_MODELS and not openai_client:
                    await websocket.send_json({
                        "type": "error",
                        "content": "OpenAI models not available (missing OPENAI_API_KEY)"
                    })
                    continue
                
                # Update conversation
                conversation = conversations[conversation_id]
                old_model = conversation.current_model
                old_mode = conversation.mode
                
                conversation.current_model = new_model
                conversation.mode = new_mode
                
                # Send confirmation
                await websocket.send_json({
                    "type": "model_changed",
                    "content": f"Model changed from {old_model} to {new_model}, mode: {new_mode}",
                    "model": new_model,
                    "mode": new_mode
                })
            
            elif message_type == "get_models":
                # Return available models
                await websocket.send_json({
                    "type": "models",
                    "claude_models": CLAUDE_MODELS if anthropic_client else [],
                    "openai_models": OPENAI_MODELS if openai_client else [],
                    "current_model": conversations[conversation_id].current_model,
                    "current_mode": conversations[conversation_id].mode
                })
            
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

@app.post("/api/chat/model")
async def set_model(request: ModelRequest):
    """Set the AI model and mode for a conversation"""
    if request.conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conversations[request.conversation_id]
    
    # Validate model
    if request.model not in CLAUDE_MODELS + OPENAI_MODELS:
        raise HTTPException(status_code=400, detail=f"Model {request.model} not supported")
    
    # Check if client for this model is available
    if request.model in CLAUDE_MODELS and not anthropic_client:
        raise HTTPException(status_code=400, detail="Claude models not available (missing ANTHROPIC_API_KEY)")
    
    if request.model in OPENAI_MODELS and not openai_client:
        raise HTTPException(status_code=400, detail="OpenAI models not available (missing OPENAI_API_KEY)")
    
    # Update conversation
    old_model = conversation.current_model
    old_mode = conversation.mode
    
    conversation.current_model = request.model
    conversation.mode = request.mode
    
    return {
        "status": "success",
        "message": f"Model changed from {old_model} to {request.model}, mode: {request.mode}",
        "conversation_id": request.conversation_id,
        "model": request.model,
        "mode": request.mode
    }

@app.get("/api/chat/models")
async def get_available_models():
    """Get list of available AI models"""
    available_models = {
        "claude": CLAUDE_MODELS if anthropic_client else [],
        "openai": OPENAI_MODELS if openai_client else [],
        "current_defaults": {
            "claude": ANTHROPIC_MODEL if anthropic_client else None,
            "openai": OPENAI_MODEL if openai_client else None
        }
    }
    
    return available_models

@app.get("/api/chat/conversation/{conversation_id}/info")
async def get_conversation_info(conversation_id: str):
    """Get conversation information including current model and mode"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conversations[conversation_id]
    
    return {
        "conversation_id": conversation_id,
        "current_model": conversation.current_model,
        "mode": conversation.mode,
        "message_count": len(conversation.messages),
        "available_tools": len(conversation.active_tools) if conversation.mode == "agent" else 0
    }

# Root endpoint for service info
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Agent Orchestrator Service",
        "version": "1.0.0",
        "status": "running",
        "default_models": {
            "claude": ANTHROPIC_MODEL if anthropic_client else None,
            "openai": OPENAI_MODEL if openai_client else None
        },
        "available_models": {
            "claude": CLAUDE_MODELS if anthropic_client else [],
            "openai": OPENAI_MODELS if openai_client else []
        },
        "endpoints": {
            "/api/chat/conversation": "Create a new conversation",
            "/api/chat/message": "Send a message to the agent",
            "/api/chat/model": "Set AI model and mode for conversation",
            "/api/chat/models": "Get available AI models",
            "/api/chat/conversation/{id}/info": "Get conversation information",
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