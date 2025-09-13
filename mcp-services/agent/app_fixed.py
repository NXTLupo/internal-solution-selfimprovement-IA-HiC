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
UPLOAD_MCP_URL = os.environ.get("UPLOAD_MCP_URL", "http://upload-mcp:8504")

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
    active_jobs: Dict[str, Dict[str, Any]] = Field({}, description="Active jobs tracking - job_id to metadata mapping")

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
    "upload": UPLOAD_MCP_URL
}

# Cache the available tools from each service
async def fetch_and_cache_tools():
    """Fetch tool definitions from all services and cache them"""
    global tool_definitions
    
    for service_name, service_url in tool_services.items():
        if service_name == "upload":
            continue  # Skip upload service as it doesn't have tools
            
        try:
            response = requests.get(f"{service_url}/mcp/tools")
            
            if response.status_code == 200:
                tools = response.json()
                for tool in tools:
                    tool_name = tool.get("name")
                    if tool_name:
                        tool_definitions[tool_name] = {
                            "service": service_name,
                            "url": f"{service_url}/mcp/invoke/{tool_name}",
                            "spec": tool
                        }
                        logger.info(f"Cached tool definition for {tool_name}")
            else:
                logger.warning(f"Failed to fetch tools from {service_name}: {response.status_code}")
        except Exception as e:
            logger.error(f"Error fetching tools from {service_name}: {str(e)}")

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
            required = " (REQUIRED)" if param_name in tool_spec.get("required", []) else ""
            
            tools_description += f"- {param_name}: {param_type}{required} - {param_desc}{param_default}\n"
            
        tools_description += "\n"
    
    # Create a simpler system prompt without nested braces
    system_prompt = """You are the Customer Experience Workbench Assistant for NXT Humans, helping users analyze customer experiences using our specialized tools.

Your primary tools are:
1. Reddit Data Collector (reddit.*) - Scrapes and analyzes posts from Reddit
2. Social Research Tool (social.*) - Performs topic modeling and sentiment analysis on social data
3. Journey Mapper (journey.*) - Creates customer journey maps from data files

To use a tool, respond with a JSON object in this format:
```
{
  "tool_calls": [
    {
      "name": "tool.name",
      "parameters": {
        "param1": "value1",
        "param2": "value2"
      }
    }
  ]
}
```

IMPORTANT NOTES FOR JOURNEY MAPPING:
- When a user uploads a file, you MUST first use journey.upload_file with the "file_id" parameter (NOT "file")
- Example: "parameters": {"file_id": "uploaded_id_here"}
- After uploading, use the returned file_id in your journey.generate_map call
- Always check progress with journey.get_status and retrieve results with journey.get_results
"""
    
    # Add the tools description
    system_prompt += "\n\nAvailable tools:\n\n" + tools_description
    
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
        if "```json" in response or "```" in response:
            # Find the first code block, regardless of language
            if "```json" in response:
                json_block = response.split("```json")[1].split("```")[0].strip()
            else:
                json_block = response.split("```")[1].split("```")[0].strip()
            
            # Try to parse the JSON
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
    """Execute a tool call and return the result"""
    tool_name = tool_call.name
    parameters = tool_call.parameters.copy()  # Create a copy to avoid modifying the original
    
    # Check if tool exists
    if tool_name not in tool_definitions:
        logger.warning(f"Tool {tool_name} not found in definitions")
        return {
            "error": f"Tool '{tool_name}' not found",
            "status": "error"
        }
    
    tool_info = tool_definitions[tool_name]
    tool_url = tool_info["url"]
    
    # Handle parameter naming issues between journey.upload_file and agent
    if tool_name == "journey.upload_file":
        # If Claude used "file_id" parameter but the journey-mcp expects "file"
        if "file_id" in parameters and "file" not in parameters:
            logger.info(f"Converting 'file_id' parameter to 'file' for {tool_name}")
            file_id_value = parameters.pop("file_id")
            parameters["file"] = file_id_value
    
    # Replace any file parameters with actual file content if needed
    file_data = None
    file_param_name = None
    file_id_value = None
    
    # Check for parameters that could be file references
    potential_file_params = ["file", "file_id"]
    for param_name in potential_file_params:
        if param_name in parameters and isinstance(parameters[param_name], str):
            param_value = parameters[param_name]
            file_id = param_value
            file_path = conversations[conversation_id].file_mappings.get(file_id)
            
            if file_path and os.path.exists(file_path):
                # Load file for sending
                with open(file_path, "rb") as f:
                    file_data = f.read()
                file_param_name = "file"  # Force the parameter name to "file" for service compatibility
                file_id_value = param_value
                
                # Remove from parameters as we'll send it separately
                if param_name in parameters:
                    parameters.pop(param_name)
                break
    
    try:
        # Execute tool call
        if file_data and file_param_name:
            # If we have file data, send as multipart/form-data
            # Create proper file tuple for requests (filename, file-like object, content-type)
            file_path = conversations[conversation_id].file_mappings.get(file_id_value)
            file_name = os.path.basename(file_path) if file_path else "uploaded_file"

            import io
            file_object = io.BytesIO(file_data)
            files = {file_param_name: (file_name, file_object, "application/octet-stream")}

            # Convert all parameters to form fields
            form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v)
                         for k, v in parameters.items()}

            logger.info(f"Sending file upload for tool {tool_name} with filename {file_name}")
            response = requests.post(tool_url, files=files, data=form_data)
        else:
            # Otherwise, send as form data
            form_data = {k: str(v) if not isinstance(v, (dict, list)) else json.dumps(v)
                         for k, v in parameters.items()}

            logger.info(f"Sending form data for tool {tool_name}: {form_data}")
            response = requests.post(tool_url, data=form_data)
        
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

# Process user message with Claude
async def process_message(conversation_id: str, user_message: str, uploaded_file_id: Optional[str] = None) -> str:
    """Process a user message with Claude and invoke tools as needed"""
    # Get or initialize conversation
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)

    conversation = conversations[conversation_id]

    # Check if user message is asking about job status
    if "status" in user_message.lower() and "job" in user_message.lower() and conversation.active_jobs:
        # Look for job IDs in the message - use a copy of the keys
        active_job_ids = list(conversation.active_jobs.keys())
        for job_id in active_job_ids:
            if job_id in user_message and job_id in conversation.active_jobs:
                # User is asking about a specific job
                job_info = conversation.active_jobs[job_id]
                tool_name = job_info.get("tool", "")

                # Check the current status via appropriate tool
                try:
                    if "journey" in tool_name:
                        status_tool = ToolCall(
                            name="journey.get_status",
                            parameters={"journey_id": job_id}
                        )
                    elif "social.topic_model" in tool_name:
                        status_tool = ToolCall(
                            name="social.get_topic_status",
                            parameters={"job_id": job_id}
                        )
                    elif "social.sentiment_analysis" in tool_name:
                        status_tool = ToolCall(
                            name="social.get_sentiment_status",
                            parameters={"job_id": job_id}
                        )
                    elif "reddit.search" in tool_name:
                        status_tool = ToolCall(
                            name="reddit.get_status",
                            parameters={"job_id": job_id}
                        )
                    else:
                        continue

                    status_result = await execute_tool_call(status_tool, conversation_id)
                    job_info["status"] = status_result.get("status", "unknown")
                    job_info["last_checked"] = time.time()

                    # Add result to conversation
                    status_msg = f"Status check for job {job_id}: {status_result.get('status', 'unknown')}"
                    if "progress" in status_result:
                        status_msg += f", Progress: {status_result['progress']}%"
                    if "message" in status_result:
                        status_msg += f"\nMessage: {status_result['message']}"

                    conversation.messages.append(Message(role="user", content=status_msg))
                except Exception as e:
                    logger.error(f"Error checking job status: {str(e)}")

                break
    
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

    # Update job statuses for any active jobs
    if conversation.active_jobs:
        # Create a copy of job IDs to avoid "dictionary changed size during iteration" error
        job_ids = list(conversation.active_jobs.keys())
        for job_id in job_ids:
            if job_id not in conversation.active_jobs:
                continue

            job_info = conversation.active_jobs[job_id]
            tool_name = job_info.get("tool", "")
            if "journey" in tool_name and tool_name != "journey.get_status":
                # Check journey mapper job status
                try:
                    status_tool = ToolCall(
                        name="journey.get_status",
                        parameters={"journey_id": job_id}
                    )
                    status_result = await execute_tool_call(status_tool, conversation_id)

                    # Check if job still exists in dictionary
                    if job_id in conversation.active_jobs:
                        conversation.active_jobs[job_id]["status"] = status_result.get("status", "unknown")
                        conversation.active_jobs[job_id]["last_checked"] = time.time()
                        logger.info(f"Updated job status for {job_id}: {conversation.active_jobs[job_id]['status']}")

                        # If job is completed, add a note to conversation history
                        if conversation.active_jobs[job_id]["status"] == "completed" and not conversation.active_jobs[job_id].get("notified_completion", False):
                            completion_msg = f"Job {job_id} for {tool_name} has completed. You can retrieve the results."
                            conversation.messages.append(Message(role="user", content=completion_msg))
                            conversation.active_jobs[job_id]["notified_completion"] = True

                except Exception as e:
                    logger.error(f"Error checking job status for {job_id}: {str(e)}")

    # Check if Claude wants to call a tool
    tool_calls = parse_tool_calls(assistant_response)
    
    if tool_calls:
        # Claude wants to use tools
        original_response = assistant_response
        
        # Extract just the text before the JSON if any
        if "```" in original_response:
            explanation = original_response.split("```")[0].strip()
        elif original_response.strip().startswith("{"):
            explanation = "I'll help you with that by using the appropriate tools:"
        else:
            explanation = original_response
        
        # Add Claude's explanation to conversation
        conversation.messages.append(Message(role="assistant", content=explanation))

        # Also include information about the tool in the explanation
        tool_type = tool_calls[0].name.split('.')[0] if '.' in tool_calls[0].name else 'unknown'
        if tool_type == "journey":
            conversation.messages.append(Message(role="assistant", content="I'm using the Journey Mapper to process your request. This might take some time, so I'll provide you with a job ID that we can use to check the status later."))
        
        # Execute each tool call
        for tool_call in tool_calls:
            # Log the tool call
            logger.info(f"Executing tool call: {tool_call.name}")
            
            # Add tool call to conversation
            tool_call_msg = f"I'll use the {tool_call.name} tool with parameters: {json.dumps(tool_call.parameters, indent=2)}"
            conversation.messages.append(Message(role="assistant", content=tool_call_msg))
            
            # Execute tool call
            tool_results = await execute_tool_call(tool_call, conversation_id)

            # Track job IDs from certain tool calls
            if tool_call.name in ["journey.generate_map", "social.topic_model", "social.sentiment_analysis", "reddit.search"]:
                if "job_id" in tool_results or "journey_id" in tool_results:
                    job_id = tool_results.get("job_id") or tool_results.get("journey_id")
                    if job_id:
                        conversation.active_jobs[job_id] = {
                            "tool": tool_call.name,
                            "parameters": tool_call.parameters,
                            "timestamp": time.time(),
                            "status": "submitted"
                        }
                        logger.info(f"Tracking job {job_id} for {tool_call.name} in conversation {conversation_id}")

            # Format results for Claude
            formatted_results = format_tool_results(tool_call, tool_results)

            # Add tool results to conversation
            conversation.messages.append(Message(role="user", content=f"Tool Results:\n{formatted_results}"))
        
        # Prepare messages for Claude
        claude_messages = []
        for msg in conversation.messages:
            claude_messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add information about active jobs if there are any
        if conversation.active_jobs:
            job_status_msg = "Active jobs in this conversation:\n"
            # Create a copy of job IDs for safe iteration
            jobs_to_display = dict(conversation.active_jobs)
            for job_id, job_info in jobs_to_display.items():
                tool_name = job_info.get("tool", "Unknown tool")
                status = job_info.get("status", "submitted")
                job_status_msg += f"- Job ID: {job_id}, Tool: {tool_name}, Status: {status}\n"

            claude_messages.append({
                "role": "user",
                "content": job_status_msg
            })

        # Add special instruction for Claude
        claude_messages.append({
            "role": "user",
            "content": "Please provide a clear response based on the tool results above. Remember to include any relevant job IDs so you can check their status later. Do not use any more tools in this response."
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
                        logger.info(f"Received file upload: {file_name}")
                        file_data = base64.b64decode(file_data_base64)

                        # Save file to temporary location
                        file_id = str(uuid.uuid4())
                        temp_dir = tempfile.gettempdir()
                        file_path = os.path.join(temp_dir, f"{file_id}_{file_name}")

                        with open(file_path, "wb") as f:
                            f.write(file_data)

                        # Store file path
                        uploaded_files[file_id] = file_path
                        logger.info(f"File saved: {file_path} with ID {file_id}")

                        # Prepare a simplified message informing about the upload
                        acknowledgment = f"I've received your file '{file_name}'. Let me know how you'd like to use it."

                        # If the user provided a specific instruction with the file, process it
                        if message_text and len(message_text.strip()) > 5:  # Arbitrary threshold for a meaningful message
                            # Process message with Claude
                            logger.info(f"Processing file with message: {message_text}")
                            response = await process_message(conversation_id, message_text, file_id)

                            # Send response back to client
                            await websocket.send_json({
                                "type": "message",
                                "content": response
                            })
                        else:
                            # Just acknowledge the file upload
                            await websocket.send_json({
                                "type": "message",
                                "content": acknowledgment
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
    return {"status": "healthy", "service": "agent-orchestrator"}

# Get file endpoint for MCP services
@app.get("/api/files/{file_id}")
async def get_file(file_id: str):
    """Get a file stored by the agent by ID"""
    if file_id not in uploaded_files:
        raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

    file_path = uploaded_files[file_id]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {file_id} no longer exists on disk")

    try:
        # Read file data
        with open(file_path, "rb") as f:
            file_data = f.read()

        # Encode as base64
        encoded_data = base64.b64encode(file_data).decode("utf-8")

        # Return file info
        return {
            "file_id": file_id,
            "file_name": os.path.basename(file_path).split("_", 1)[1],  # Remove UUID prefix
            "file_data": encoded_data,
            "file_size": len(file_data)
        }
    except Exception as e:
        logger.exception(f"Error reading file {file_id}")
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

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
            "/api/files/{file_id}": "Get file by ID",
            "/ws/{conversation_id}": "WebSocket endpoint for real-time chat"
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