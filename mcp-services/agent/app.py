"""
Agent Orchestrator Service
-------------------------
The platform coordinator: it receives the user's ask (Launchpad WebSocket or HTTP), routes it to the thread that
owns its job or engagement, calls the MCP tool services, and answers.

2026-10-31 (plan agent-stack-shared-memory-skills-uplift):
  - WS-D D1: a THREAD REGISTRY with location markers (threads.py), conversations persisted to
    hic-workspace/agent so a restart loses nothing, and routing of a new ask to the owning thread.
  - WS-D D2: models come from the routing authority (/api/models seats: Flash for plain chat, the reasoning model
    once a tool chain runs) and every call goes through the research proxy's provider routes; the agent holds no
    provider key and no model id. The dead `openai_journey` service is gone.
  - WS-B B2: memory is recalled at the start of each turn and admitted after a completed tool chain, through the
    proxy's ONE memory door.
  - WS-A A4/A5: the skill registry's `platform-agent` packages are mounted into the system prompt (re-fetched when
    their hash changes) and each turn records the skills it carried.
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
from pydantic import BaseModel, Field
from websockets.exceptions import ConnectionClosedError
import base64

import hic_door as door
import threads as thr

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("agent-orchestrator")

REDDIT_MCP_URL = os.environ.get("REDDIT_MCP_URL", "http://reddit-mcp:8501")
SOCIAL_MCP_URL = os.environ.get("SOCIAL_MCP_URL", "http://social-mcp:8502")
JOURNEY_MCP_URL = os.environ.get("JOURNEY_MCP_URL", "http://journey-mcp:8503")
VIDEO_MCP_URL = os.environ.get("VIDEO_MCP_URL", "http://video-mcp:8504")

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
    file_mappings: Dict[str, str] = Field({}, description="Map file IDs to temporary file paths")
    journey_mappings: Dict[str, str] = Field({}, description="Map file IDs to journey IDs for tracking journey generation")

# Create FastAPI app
app = FastAPI(
    title="Agent Orchestrator Service",
    description="Coordinates the user's asks across the MCP tool services, with threads, memory and skills",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Live conversations (a cache over hic-workspace/agent/conversations; the disk copy survives a restart)
conversations: Dict[str, Conversation] = {}
uploaded_files: Dict[str, str] = {}
tool_definitions: Dict[str, Dict[str, Any]] = {}

# Tool service URLs. 2026-10-31 (D2): `openai_journey` removed; it had no compose service and failed discovery on
# every start.
tool_services = {
    "reddit": REDDIT_MCP_URL,
    "social": SOCIAL_MCP_URL,
    "journey": JOURNEY_MCP_URL,
    "video": VIDEO_MCP_URL,
    "research": os.getenv("RESEARCH_MCP_URL", "http://research-mcp:8507"),
    # E3.1 (2026-08-21): HTML-to-video rendering. lint_composition is free,
    # render_composition is minutes of CPU that bakes copy into pixels, so the tool
    # descriptions tell the model to lint first.
    "video_render": os.getenv("VIDEO_RENDER_MCP_URL", "http://video-render-mcp:8508"),
}

seats = door.Seats()
skill_mount = door.SkillMount("platform-agent")
_registry_lock = asyncio.Lock()

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

# The system message: the tool catalog (from discovery), the mounted skill packages, recalled memory, the thread.
def tool_catalog() -> str:
    by_service: Dict[str, List[str]] = {}
    lines: List[str] = []
    for tool_name, tool_info in sorted(tool_definitions.items()):
        spec = tool_info.get("spec", {})
        by_service.setdefault(tool_info.get("service", "?"), []).append(tool_name)
        lines.append(f"## {tool_name}\n{spec.get('description', 'No description provided')}\n")
        params = spec.get("parameters")
        if not params and isinstance(spec.get("inputSchema"), dict):
            params = spec["inputSchema"].get("properties", {})
        lines.append("Parameters:")
        for param_name, param_info in (params or {}).items():
            if not isinstance(param_info, dict):
                continue
            default = f" (default: {param_info.get('default')})" if "default" in param_info else ""
            lines.append(f"- {param_name}: {param_info.get('type', 'unknown')} - {param_info.get('description', 'No description')}{default}")
        lines.append("")
    services = "\n".join(f"- {svc}: {', '.join(names)}" for svc, names in sorted(by_service.items()))
    return f"Services and their tools:\n{services}\n\n" + "\n".join(lines)


def create_system_message(memory_block: str = "", thread: Optional[Dict[str, Any]] = None) -> str:
    thread_block = ""
    if thread:
        thread_block = (f"\nTHIS THREAD: {thread.get('title')}"
                        + (f"; engagement {thread.get('engagement')}" if thread.get("engagement") else "")
                        + (f"; jobs {', '.join(thread.get('job_ids')[-5:])}" if thread.get("job_ids") else "")
                        + f"; runs {thread.get('location', 'cloud')}.\n")
    memory = f"\nWHAT THE TEAM ALREADY ESTABLISHED (long-term memory recalled for this ask; build on it, never restate it as new):\n{memory_block}\n" if memory_block else ""
    skills = skill_mount.block()
    return f"""You are the NXT Humans Customer Experience Workbench coordinator. You help the team analyze customer experiences with the platform's research tools: Reddit and social listening, topic and sentiment modeling, journey mapping, video transcription and rendering, and Humans in Control (HiC) research deliverables.
{thread_block}{memory}
{skills}

AVAILABLE TOOLS
{tool_catalog()}

To use a tool, respond ONLY with this JSON block (no prose before it is required):
```json
{{
  "tool_calls": [
    {{"name": "tool_name", "parameters": {{"param1": "value1"}}}}
  ]
}}
```

Guidelines:
- Long-running tools return a job id; check it with the matching status tool before reading results.
- HiC deliverables run through the research tools (run_deliverable, get_job, get_run_state, list_artifacts); name the engagement.
- When the answer needs no tool, answer directly. Name the sources a tool returned; never invent a source, a number or a result.
- Lead with the answer. No meta-narration, no em dashes.
"""

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
            file_path = get_conversation_sync(conversation_id).file_mappings.get(file_id)
            
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
            file_path = get_conversation_sync(conversation_id).file_mappings.get(param_value)
            
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
        journey_id = get_conversation_sync(conversation_id).journey_mappings.get(file_id)
        
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

def get_conversation_sync(conversation_id: str) -> Conversation:
    """The live conversation, loaded from disk when this process has not seen it (a restart, or a routed thread)."""
    conv = conversations.get(conversation_id)
    if conv is not None:
        return conv
    data = thr.load_conversation(conversation_id) or {}
    conv = Conversation(
        id=conversation_id,
        messages=[Message(**m) for m in data.get("messages", []) if isinstance(m, dict) and m.get("role") and m.get("content")],
        file_mappings=data.get("file_mappings") or {},
        journey_mappings=data.get("journey_mappings") or {},
    )
    conversations[conversation_id] = conv
    return conv


def persist_conversation(conv: Conversation) -> None:
    try:
        thr.save_conversation(conv.id, {"id": conv.id, "messages": [m.model_dump() for m in conv.messages][-200:],
                                        "file_mappings": conv.file_mappings, "journey_mappings": conv.journey_mappings})
    except Exception as e:
        logger.warning(f"[threads] could not persist {conv.id}: {e}")


async def initialize_conversation(conversation_id: str) -> Conversation:
    if not tool_definitions:
        await fetch_and_cache_tools()
    return get_conversation_sync(conversation_id)


async def process_message(conversation_id: str, user_message: str, uploaded_file_id: Optional[str] = None) -> Dict[str, Any]:
    """One turn: route to the owning thread, recall memory, answer (chat seat) or run tools and synthesize
    (tool-chain seat), admit what the tools established, persist the thread."""
    t0 = time.time()
    async with _registry_lock:
        registry = thr.load_registry()
    target = thr.route_message(registry, conversation_id, user_message) or conversation_id
    routed = target != conversation_id
    if routed:
        logger.info(f"[threads] ask routed from {conversation_id} to the thread that owns it: {target}")
    conversation = get_conversation_sync(target)
    thread_row = registry.get(target)

    conversation.messages.append(Message(role="user", content=user_message))
    if uploaded_file_id:
        file_path = uploaded_files.get(uploaded_file_id)
        if file_path:
            conversation.file_mappings[uploaded_file_id] = file_path
            conversation.messages.append(Message(role="user", content=f"User uploaded a file: {os.path.basename(file_path)} (ID: {uploaded_file_id}). You can use this file_id in tool calls that accept files."))

    engagement = (thread_row or {}).get("engagement", "")
    await skill_mount.refresh()
    memory = await door.recall(f"{user_message} {engagement}".strip(), engagement)
    system = create_system_message(memory["rendered"], thread_row)
    chat_model = await seats.seat("agent_chat")
    tools_used: List[str] = []
    job_ids: List[str] = []
    models_used = [chat_model]
    admitted = None
    try:
        assistant_response = await door.complete(chat_model, system, [m.model_dump() for m in conversation.messages], max_tokens=4096)
    except Exception as e:
        logger.exception("chat model call failed")
        reply = f"The model route is unavailable right now ({str(e)[:120]}). Nothing was run; ask again in a moment."
        conversation.messages.append(Message(role="assistant", content=reply))
        persist_conversation(conversation)
        return {"reply": reply, "thread_id": target, "routed": routed}

    tool_calls = parse_tool_calls(assistant_response)
    if tool_calls:
        explanation = assistant_response.split("```json")[0].strip() if "```json" in assistant_response else ""
        if explanation:
            conversation.messages.append(Message(role="assistant", content=explanation))
        any_error = False
        for tool_call in tool_calls:
            logger.info(f"Executing tool call: {tool_call.name}")
            conversation.messages.append(Message(role="assistant", content=f"I'll use the {tool_call.name} tool with parameters: {json.dumps(tool_call.parameters, indent=2)}"))
            tool_results = await execute_tool_call(tool_call, target)
            tools_used.append(tool_call.name)
            any_error = any_error or (isinstance(tool_results, dict) and tool_results.get("status") == "error")
            job_ids.extend(j for j in thr.extract_job_ids(tool_results) if j not in job_ids)
            engagement = engagement or thr.extract_engagement(tool_call.parameters, tool_results)
            if tool_call.name.endswith("_generate_map") and isinstance(tool_results, dict) and "journey_id" in tool_results:
                file_id = tool_call.parameters.get("file_id")
                if file_id and tool_results["journey_id"]:
                    conversation.journey_mappings[file_id] = tool_results["journey_id"]
            conversation.messages.append(Message(role="user", content=f"Tool Results:\n{format_tool_results(tool_call, tool_results)}"))
        conversation.messages.append(Message(role="user", content="Please provide a clear response based on the tool results above. Do not use any more tools in this response."))
        chain_model = await seats.seat("agent_tool_chain")
        models_used.append(chain_model)
        try:
            final = await door.complete(chain_model, create_system_message(memory["rendered"], thread_row), [m.model_dump() for m in conversation.messages], max_tokens=16000)
        except Exception as e:
            logger.exception("tool-chain model call failed")
            final = f"The tools ran ({', '.join(tools_used)}), but the synthesis model is unavailable ({str(e)[:120]}). The raw results are in this thread."
            any_error = True
        conversation.messages.pop()          # the synthesis instruction is scaffolding, not history
        conversation.messages.append(Message(role="assistant", content=final))
        reply = final
        if not any_error:
            fact = door.tool_chain_fact(user_message, final, tools_used)
            if fact:
                admitted = await door.admit([fact], f"agent_{thr.safe_id(target)}", engagement)
    else:
        reply = assistant_response
        conversation.messages.append(Message(role="assistant", content=assistant_response))

    persist_conversation(conversation)
    async with _registry_lock:
        registry = thr.load_registry()
        row = thr.upsert_thread(registry, target, user_message=user_message, reply=reply, tools=tools_used, job_ids=job_ids, engagement=engagement)
        row.setdefault("source", "platform-agent")
        thr.save_registry(registry)
    events = [{"kind": "agent_turn", "surface": "platform-agent", "thread_id": target, "routed": routed, "models": models_used,
               "tools": tools_used, "job_ids": job_ids[:10], "memory_recalled": len(memory["ids"]), "location": row.get("location"),
               "memory_admitted": bool(admitted and admitted.get("report", {}).get("admitted")), "elapsed_ms": int((time.time() - t0) * 1000)}]
    events += [{"kind": "skill", "skill_id": sid, "version": ver, "via": "mounted", "surface": "platform-agent", "role": "system-prompt"}
               for sid, ver in skill_mount.versions().items()]
    await door.telemetry(events)
    return {"reply": reply, "thread_id": target, "routed": routed, "title": row.get("title")}

# API Endpoints
@app.post("/api/chat/conversation")
async def create_conversation():
    conversation_id = str(uuid.uuid4())
    await initialize_conversation(conversation_id)
    return {"conversation_id": conversation_id}

@app.post("/api/chat/message")
async def send_message(
    conversation_id: str = Form(...),
    message: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    file_id = None
    if file:
        file_id = str(uuid.uuid4())
        file_path = os.path.join(tempfile.gettempdir(), f"{file_id}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(await file.read())
        uploaded_files[file_id] = file_path
    out = await process_message(conversation_id, message, file_id)
    return out

@app.get("/api/threads")
async def list_threads(limit: int = 50):
    """D1: the thread list (newest first) with location markers, for the Launchpad."""
    registry = thr.load_registry()
    rows = sorted(registry.values(), key=lambda r: str(r.get("updated_at") or ""), reverse=True)[:max(1, min(limit, 200))]
    return {"count": len(registry), "threads": rows}

@app.post("/api/threads/report")
async def report_thread(payload: dict):
    """D1: other coordinators (NXT-Agency's Launchpad chat) report their conversations into the ONE thread registry,
    so the Launchpad's thread list shows every thread with its location: `local` once computer use ran."""
    tid = str(payload.get("id") or "").strip()
    if not tid:
        raise HTTPException(status_code=400, detail="id required")
    tools = [str(t) for t in (payload.get("tools") or []) if t]
    async with _registry_lock:
        registry = thr.load_registry()
        row = thr.upsert_thread(registry, tid, user_message=str(payload.get("user_message") or ""), reply=str(payload.get("reply") or ""),
                                tools=tools, job_ids=thr.extract_job_ids(payload.get("reply") or ""), engagement=str(payload.get("engagement") or ""))
        row["source"] = str(payload.get("source") or "external")
        thr.save_registry(registry)
    return {"ok": True, "thread": row}

# 2026-10-31 (agent-stack plan WS-D D3): the coordinator receives the signed report of a job it delegated through the
# proxy's webhook (POST /api/webhooks/run with callback_url http://agent:8500/api/webhooks/hic). The signature is
# HMAC-SHA256 over "<timestamp>.<raw body>" with this agent's webhook secret (HIC_WEBHOOK_SOURCE in
# .runtime/webhook-secrets.json); the report attaches to the thread that owns the job id, and every report is kept.
WEBHOOK_SOURCE = os.environ.get("HIC_WEBHOOK_SOURCE", "platform-agent")


def _webhook_secret() -> str:
    try:
        with open(os.path.join(os.environ.get("HIC_RUNTIME_DIR", "/hic-workspace/.runtime"), "webhook-secrets.json"), "r", encoding="utf-8") as f:
            return str(((json.load(f) or {}).get("sources") or {}).get(WEBHOOK_SOURCE) or "")
    except Exception:
        return ""


@app.post("/api/webhooks/hic")
async def receive_hic_report(request: Request):
    import hmac as _hmac
    import hashlib as _hashlib
    secret = _webhook_secret()
    if not secret:
        raise HTTPException(status_code=404, detail="Not Found")
    raw = await request.body()
    ts = request.headers.get("x-hic-timestamp", "")
    sig = request.headers.get("x-hic-signature", "")
    want = "sha256=" + _hmac.new(secret.encode("utf-8"), ts.encode("utf-8") + b"." + raw, _hashlib.sha256).hexdigest()
    try:
        fresh = abs(time.time() - int(ts)) <= 300
    except ValueError:
        fresh = False
    if not fresh or not _hmac.compare_digest(sig, want):
        raise HTTPException(status_code=401, detail="bad or stale signature")
    try:
        report = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        raise HTTPException(status_code=400, detail="invalid JSON")
    job_id = str(report.get("job_id") or "")
    attached = None
    async with _registry_lock:
        registry = thr.load_registry()
        for tid, row in registry.items():
            if job_id and job_id in (row.get("job_ids") or []):
                row.setdefault("reports", []).append({k: report.get(k) for k in ("job_id", "status", "artifact_id", "launcher_url", "verdict", "error", "finished_at")})
                row["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                attached = tid
                break
        if attached:
            thr.save_registry(registry)
    try:
        os.makedirs(thr.AGENT_DIR, exist_ok=True)
        with open(os.path.join(thr.AGENT_DIR, "webhook-reports.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps({"received_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "thread_id": attached, **report}) + "\n")
    except Exception as e:
        logger.warning(f"[webhook] report not logged: {e}")
    logger.info(f"[webhook] report for {job_id} ({report.get('status')}){' -> thread ' + attached if attached else ''}")
    return {"ok": True, "thread_id": attached}


@app.get("/api/threads/{thread_id}")
async def get_thread(thread_id: str):
    registry = thr.load_registry()
    conv = get_conversation_sync(thread_id)
    if thread_id not in registry and not conv.messages:
        raise HTTPException(status_code=404, detail="no such thread")
    return {"thread": registry.get(thread_id), "messages": [m.model_dump() for m in conv.messages if not m.content.startswith("Tool Results:")][-100:]}

@app.get("/api/chat/ws/{conversation_id}")
async def websocket_endpoint_info(conversation_id: str):
    return {"ws_url": f"/ws/{conversation_id}"}

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    conv = await initialize_conversation(conversation_id)
    try:
        greeting = ("Welcome back. This thread continues where it left off." if conv.messages else
                    "I'm the NXT Humans Customer Experience Workbench coordinator. I can run social listening, topic and sentiment models, journey maps, video transcription and HiC research deliverables. What do you need?")
        await websocket.send_json({"type": "message", "content": greeting, "thread_id": conversation_id})
    except Exception as e:
        logger.error(f"Error sending welcome message: {str(e)}")

    async def _answer(text: str, file_id: Optional[str] = None):
        out = await process_message(conversation_id, text or "", file_id)
        if out.get("routed"):
            await websocket.send_json({"type": "routed", "thread_id": out["thread_id"], "title": out.get("title"),
                                       "content": f"Continuing in the thread that owns this work: {out.get('title') or out['thread_id']}"})
        await websocket.send_json({"type": "message", "content": out["reply"], "thread_id": out["thread_id"]})

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type", "")
            if message_type == "message":
                await _answer(data.get("content", ""))
            elif message_type == "file":
                file_data_base64 = data.get("file", {}).get("data", "")
                file_name = data.get("file", {}).get("name", "unnamed_file")
                if file_data_base64:
                    try:
                        file_id = str(uuid.uuid4())
                        file_path = os.path.join(tempfile.gettempdir(), f"{file_id}_{file_name}")
                        with open(file_path, "wb") as f:
                            f.write(base64.b64decode(file_data_base64))
                        uploaded_files[file_id] = file_path
                        await _answer(data.get("content", ""), file_id)
                    except Exception as e:
                        logger.exception("Error processing file upload")
                        await websocket.send_json({"type": "error", "content": f"Error processing file upload: {str(e)}"})
                else:
                    await websocket.send_json({"type": "error", "content": "No file data provided"})
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({"type": "error", "content": f"Unknown message type: {message_type}"})
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {conversation_id}")
    except ConnectionClosedError:
        logger.info(f"WebSocket connection closed: {conversation_id}")
    except Exception as e:
        logger.exception(f"Error in WebSocket connection: {str(e)}")
        try:
            await websocket.send_json({"type": "error", "content": f"Server error: {str(e)}"})
        except Exception:
            pass

@app.get("/health")
async def health_check():
    s = await seats.refresh()
    registry = thr.load_registry()
    return {
        "status": "healthy",
        "service": "agent-orchestrator",
        "model": s.get("agent_tool_chain"),
        "seats": s,
        "seats_source": seats.source,
        "tools_cached": len(tool_definitions),
        "available_tools": list(tool_definitions.keys()),
        "services": list(tool_services.keys()),
        "skills_mounted": skill_mount.versions(),
        "skills_error": skill_mount.error,
        "threads": len(registry),
        "active_conversations": len(conversations),
    }

@app.post("/refresh-tools")
async def refresh_tools():
    global tool_definitions
    tool_definitions = {}
    await fetch_and_cache_tools()
    await skill_mount.refresh(force=True)
    await seats.refresh(force=True)
    return {"status": "success", "message": "Tool definitions, skills and model seats refreshed", "tools": list(tool_definitions.keys()),
            "skills": skill_mount.versions(), "seats": seats.seats}

@app.get("/")
async def root():
    return {
        "service": "Agent Orchestrator Service",
        "version": "2.0.0",
        "status": "running",
        "seats": seats.seats,
        "endpoints": {
            "/api/chat/conversation": "Create a new conversation",
            "/api/chat/message": "Send a message to the agent",
            "/api/threads": "The thread registry (newest first) with location markers",
            "/api/threads/{id}": "One thread and its messages",
            "/ws/{conversation_id}": "WebSocket endpoint for real-time chat",
            "/refresh-tools": "Force refresh tool definitions, skills and model seats",
        },
    }

@app.on_event("startup")
async def startup_event():
    await fetch_and_cache_tools()
    await seats.refresh(force=True)
    await skill_mount.refresh(force=True)
    logger.info(f"Cached {len(tool_definitions)} tool definitions; seats {seats.seats} ({seats.source}); "
                f"skills {skill_mount.versions()}; threads {len(thr.load_registry())}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8500))
    uvicorn.run(app, host="0.0.0.0", port=port)
