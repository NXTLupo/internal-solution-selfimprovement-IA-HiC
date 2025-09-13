"""
NXT Humans MCP-Compliant Chatbot
---------------------------------
Proper MCP (Model Context Protocol) implementation using Claude Messages API
with MCP server connections according to Anthropic's specification.
"""

import os
import json
import logging
import uuid
from typing import Dict, List, Any, Optional
from flask import Flask, request, jsonify, render_template
from flask.helpers import make_response
from anthropic import Anthropic
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mcp-chatbot")

# Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    logger.error("ANTHROPIC_API_KEY environment variable not set")
    raise ValueError("ANTHROPIC_API_KEY environment variable must be set")

ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

# MCP Server URLs (must be HTTPS for production)
MCP_SERVERS = {
    "reddit": {
        "name": "reddit-data-collector",
        "url": os.environ.get("REDDIT_MCP_PUBLIC_URL", "http://localhost:8501"),
        "description": "Reddit data collection and analysis tools"
    },
    "social": {
        "name": "social-research-tools", 
        "url": os.environ.get("SOCIAL_MCP_PUBLIC_URL", "http://localhost:8502"),
        "description": "Social media research and sentiment analysis tools"
    },
    "journey": {
        "name": "journey-mapper-claude",
        "url": os.environ.get("JOURNEY_MCP_PUBLIC_URL", "http://localhost:8503"), 
        "description": "Customer journey mapping with Claude 3.7 Sonnet"
    },
    "video": {
        "name": "video-transcriptor",
        "url": os.environ.get("VIDEO_MCP_PUBLIC_URL", "http://localhost:8504"),
        "description": "Video transcription and analysis tools"
    },
    "claude4_journey": {
        "name": "journey-mapper-claude4",
        "url": os.environ.get("CLAUDE4_JOURNEY_MCP_PUBLIC_URL", "http://localhost:8506"),
        "description": "Advanced customer journey mapping with Claude 3.7"
    }
}

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)

class MCPChatbot:
    """MCP-compliant chatbot using Claude Messages API"""
    
    def __init__(self):
        self.conversations: Dict[str, Dict[str, Any]] = {}
        
    def create_conversation(self) -> str:
        """Create a new conversation"""
        conversation_id = str(uuid.uuid4())
        self.conversations[conversation_id] = {
            "id": conversation_id,
            "messages": [],
            "created_at": datetime.now().isoformat()
        }
        logger.info(f"Created conversation: {conversation_id}")
        return conversation_id
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get available tools from all MCP servers"""
        all_tools = []
        
        for server_name, server_config in MCP_SERVERS.items():
            try:
                # Fetch tools from MCP server
                response = requests.get(f"{server_config['url']}/mcp/tools", timeout=5)
                
                if response.status_code == 200:
                    tools = response.json()
                    
                    # Convert MCP tool specs to Claude tool format
                    for tool in tools:
                        claude_tool = {
                            "name": tool.get("name"),
                            "description": tool.get("description"),
                            "input_schema": {
                                "type": "object",
                                "properties": tool.get("parameters", {}),
                                "required": [
                                    param_name for param_name, param_info in tool.get("parameters", {}).items()
                                    if param_info.get("required", False)
                                ]
                            }
                        }
                        all_tools.append(claude_tool)
                        
                    logger.info(f"Loaded {len(tools)} tools from {server_name}")
                else:
                    logger.warning(f"Failed to load tools from {server_name}: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Error loading tools from {server_name}: {str(e)}")
        
        logger.info(f"Total tools available: {len(all_tools)}")
        return all_tools
    
    def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call via the appropriate MCP server"""
        # Find which server handles this tool
        server_url = None
        for server_name, server_config in MCP_SERVERS.items():
            try:
                # Check if this server has the tool
                response = requests.get(f"{server_config['url']}/mcp/tools", timeout=5)
                if response.status_code == 200:
                    tools = response.json()
                    if any(tool.get("name") == tool_name for tool in tools):
                        server_url = server_config['url']
                        break
            except Exception as e:
                logger.warning(f"Error checking tools for {server_name}: {str(e)}")
        
        if not server_url:
            return {"error": f"Tool '{tool_name}' not found in any MCP server"}
        
        # Execute the tool
        try:
            tool_url = f"{server_url}/mcp/invoke/{tool_name}"
            
            # Convert parameters to form data for FastAPI compatibility
            if any(isinstance(v, (dict, list)) for v in parameters.values()):
                # If there are complex parameters, use JSON
                response = requests.post(tool_url, json=parameters, timeout=30)
            else:
                # Use form data for simple parameters
                response = requests.post(tool_url, data=parameters, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Tool execution failed: {response.status_code} - {response.text}")
                return {"error": f"Tool execution failed: {response.text}"}
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return {"error": f"Error executing tool: {str(e)}"}
    
    def send_message(self, conversation_id: str, message: str) -> str:
        """Send a message and get response using proper MCP"""
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conversation = self.conversations[conversation_id]
        
        # Add user message to conversation
        conversation["messages"].append({
            "role": "user",
            "content": message
        })
        
        # Get available tools
        tools = self.get_available_tools()
        
        # Prepare system message
        system_message = """You are the NXT Humans Customer Experience Workbench Assistant. You help users analyze customer experiences using specialized tools for Reddit data collection, social research, journey mapping, and video transcription.

You have access to powerful tools through the MCP (Model Context Protocol). Use them to help users with:

1. **Reddit Data Analysis** - Collect and analyze Reddit discussions
2. **Social Research** - Perform topic modeling and sentiment analysis  
3. **Journey Mapping** - Create customer journey maps with different AI models (Claude 3.7 or OpenAI o3)
4. **Video Transcription** - Process video content from files or YouTube URLs

Always explain what tools you're using and provide clear, actionable insights from the results."""
        
        try:
            # Make request to Claude with MCP tools
            response = anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=1024,
                system=system_message,
                messages=conversation["messages"],
                tools=tools if tools else None
            )
            
            assistant_message = response.content[0]
            
            # Handle tool calls if present
            if hasattr(assistant_message, 'type') and assistant_message.type == 'tool_use':
                # Execute tool call
                tool_result = self.execute_tool(
                    assistant_message.name, 
                    assistant_message.input
                )
                
                # Add tool call and result to conversation
                conversation["messages"].extend([
                    {
                        "role": "assistant",
                        "content": [assistant_message]
                    },
                    {
                        "role": "user", 
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": assistant_message.id,
                                "content": json.dumps(tool_result)
                            }
                        ]
                    }
                ])
                
                # Get final response after tool execution
                final_response = anthropic_client.messages.create(
                    model=ANTHROPIC_MODEL,
                    max_tokens=1024,
                    system=system_message,
                    messages=conversation["messages"],
                    tools=tools if tools else None
                )
                
                final_text = final_response.content[0].text
                conversation["messages"].append({
                    "role": "assistant",
                    "content": final_text
                })
                
                return final_text
            else:
                # Regular text response
                response_text = assistant_message.text
                conversation["messages"].append({
                    "role": "assistant", 
                    "content": response_text
                })
                
                return response_text
                
        except Exception as e:
            logger.error(f"Error getting Claude response: {str(e)}")
            error_message = f"I encountered an error: {str(e)}. Please try again."
            conversation["messages"].append({
                "role": "assistant",
                "content": error_message
            })
            return error_message

# Global chatbot instance
chatbot = MCPChatbot()

# Flask app for the chatbot interface
app = Flask(__name__)

@app.route('/mcp-chat')
def chat_interface():
    """Serve the MCP chatbot interface"""
    return render_template('mcp_chatbot.html')

@app.route('/api/mcp/conversation', methods=['POST'])
def create_conversation():
    """Create a new MCP conversation"""
    try:
        conversation_id = chatbot.create_conversation()
        return jsonify({"conversation_id": conversation_id})
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/mcp/message', methods=['POST'])
def send_message():
    """Send a message to the MCP chatbot"""
    try:
        data = request.get_json()
        conversation_id = data.get('conversation_id')
        message = data.get('message')
        
        if not conversation_id or not message:
            return jsonify({"error": "Missing conversation_id or message"}), 400
        
        response = chatbot.send_message(conversation_id, message)
        return jsonify({"response": response})
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/mcp/tools')
def get_tools():
    """Get available MCP tools"""
    try:
        tools = chatbot.get_available_tools()
        return jsonify({"tools": tools})
    except Exception as e:
        logger.error(f"Error getting tools: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/mcp/servers')
def get_servers():
    """Get MCP server status"""
    server_status = {}
    
    for server_name, server_config in MCP_SERVERS.items():
        try:
            response = requests.get(f"{server_config['url']}/health", timeout=5)
            if response.status_code == 200:
                server_status[server_name] = {
                    "status": "online",
                    "url": server_config['url'],
                    "description": server_config['description']
                }
            else:
                server_status[server_name] = {
                    "status": "error",
                    "url": server_config['url'],
                    "description": server_config['description'],
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            server_status[server_name] = {
                "status": "offline",
                "url": server_config['url'],
                "description": server_config['description'],
                "error": str(e)
            }
    
    return jsonify({"servers": server_status})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('MCP_CHATBOT_PORT', 8007)))