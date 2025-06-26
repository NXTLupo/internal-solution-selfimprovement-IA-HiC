#!/usr/bin/env python3
"""
MulmoCast MCP Service
Model Context Protocol wrapper for MulmoCast CLI
"""

import os
import sys
import json
import asyncio
import logging
import subprocess
import tempfile
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin
import requests
import time

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from mcp.server import Server
    from mcp.types import Tool, TextContent
    import mcp.server.stdio
except ImportError:
    print("MCP library not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mcp"])
    from mcp.server import Server
    from mcp.types import Tool, TextContent
    import mcp.server.stdio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MulmoCast service configuration
MULMOCAST_BASE_URL = os.getenv("MULMOCAST_BASE_URL", "http://mulmocast:5008")
MULMOCAST_CLIENT_URL = os.getenv("MULMOCAST_CLIENT_URL", "http://localhost:5008")

class MulmoCastMCPService:
    def __init__(self):
        self.base_url = MULMOCAST_BASE_URL
        self.session = requests.Session()
        self.session.timeout = 30
        
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to MulmoCast web interface"""
        url = urljoin(self.base_url, endpoint)
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            
            if response.headers.get('content-type', '').startswith('application/json'):
                return response.json()
            else:
                return {"content": response.text, "status_code": response.status_code}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return {"error": str(e), "status": "failed"}
    
    def get_templates(self) -> Dict[str, Any]:
        """Get available MulmoCast templates"""
        return self._make_request("GET", "/api/templates")
    
    def execute_cli_command(self, command: str, args: List[str] = None) -> Dict[str, Any]:
        """Execute a mulmo CLI command through the web interface"""
        if args is None:
            args = []
            
        data = {
            "command": command,
            "args": args
        }
        return self._make_request("POST", "/api/execute", json=data)
    
    def generate_script(self, template: str, topic: str = None, urls: List[str] = None, interactive: bool = False) -> Dict[str, Any]:
        """Generate script using CLI scripting tool"""
        data = {
            "template": template,
            "interactive": interactive
        }
        
        if topic:
            data["topic"] = topic
            
        if urls:
            data["urls"] = urls
            
        return self._make_request("POST", "/api/scripting", json=data)
    
    def generate_audio(self, script_path: str, force: bool = False) -> Dict[str, Any]:
        """Generate audio from script"""
        data = {
            "script_path": script_path,
            "force": force
        }
        return self._make_request("POST", "/api/audio", json=data)
    
    def generate_images(self, script_path: str, force: bool = False) -> Dict[str, Any]:
        """Generate images from script"""
        data = {
            "script_path": script_path,
            "force": force
        }
        return self._make_request("POST", "/api/images", json=data)
    
    def generate_movie(self, script_path: str, force: bool = False) -> Dict[str, Any]:
        """Generate movie from script"""
        data = {
            "script_path": script_path,
            "force": force
        }
        return self._make_request("POST", "/api/movie", json=data)
    
    def generate_pdf(self, script_path: str, force: bool = False) -> Dict[str, Any]:
        """Generate PDF from script"""
        data = {
            "script_path": script_path,
            "force": force
        }
        return self._make_request("POST", "/api/pdf", json=data)
    
    def list_files(self) -> Dict[str, Any]:
        """List generated files"""
        return self._make_request("GET", "/api/files")

# Initialize MCP server
server = Server("mulmocast-mcp")
service = MulmoCastMCPService()

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available MulmoCast tools"""
    return [
        Tool(
            name="mulmocast_get_templates",
            description="Get available MulmoCast templates for different content types",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="mulmocast_generate_script",
            description="Generate a MulmoScript using the CLI tool scripting command",
            inputSchema={
                "type": "object",
                "properties": {
                    "template": {
                        "type": "string",
                        "description": "Template type (business, children_book, ghibli_comic, podcast_standard, etc.)"
                    },
                    "topic": {
                        "type": "string",
                        "description": "Topic or title for the script"
                    },
                    "urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "URLs to source content from (optional)"
                    },
                    "interactive": {
                        "type": "boolean",
                        "description": "Use interactive mode",
                        "default": False
                    }
                },
                "required": ["template"]
            }
        ),
        Tool(
            name="mulmocast_generate_audio",
            description="Generate audio from a MulmoScript file",
            inputSchema={
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
        ),
        Tool(
            name="mulmocast_generate_images",
            description="Generate images from a MulmoScript file",
            inputSchema={
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
        ),
        Tool(
            name="mulmocast_generate_movie",
            description="Generate a video/movie from a MulmoScript file",
            inputSchema={
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
        ),
        Tool(
            name="mulmocast_generate_pdf",
            description="Generate a PDF presentation from a MulmoScript file",
            inputSchema={
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
        ),
        Tool(
            name="mulmocast_list_files",
            description="List all generated files in the output directory",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="mulmocast_execute_command",
            description="Execute a raw mulmo CLI command",
            inputSchema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The mulmo command to execute (without 'mulmo' prefix)"
                    },
                    "args": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Command arguments"
                    }
                },
                "required": ["command"]
            }
        ),
        Tool(
            name="mulmocast_create_complete_workflow",
            description="Complete workflow: generate script and create multimedia content",
            inputSchema={
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
                        "default": ["movie"]
                    },
                    "urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "URLs to source content from (optional)"
                    }
                },
                "required": ["template", "topic"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""
    
    try:
        if name == "mulmocast_get_templates":
            result = service.get_templates()
            
            if isinstance(result, list):
                templates_text = "\n".join([f"• {template}" for template in result])
                return [TextContent(
                    type="text",
                    text=f"Available MulmoCast templates:\n{templates_text}"
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"Available MulmoCast templates:\n{json.dumps(result, indent=2)}"
                )]
        
        elif name == "mulmocast_generate_script":
            template = arguments["template"]
            topic = arguments.get("topic")
            urls = arguments.get("urls", [])
            interactive = arguments.get("interactive", False)
            
            result = service.generate_script(template, topic, urls, interactive)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error generating script: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"✅ Script generated successfully!\n\nOutput:\n{stdout}\n\n"
                         f"Use the generated script path with other MulmoCast tools to create multimedia content.\n"
                         f"Visit {MULMOCAST_CLIENT_URL} to see the generated files."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Script generation failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_generate_audio":
            script_path = arguments["script_path"]
            force = arguments.get("force", False)
            
            result = service.generate_audio(script_path, force)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error generating audio: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"🎵 Audio generation completed!\n\nOutput:\n{stdout}\n\n"
                         f"Visit {MULMOCAST_CLIENT_URL} to download the audio files."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Audio generation failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_generate_images":
            script_path = arguments["script_path"]
            force = arguments.get("force", False)
            
            result = service.generate_images(script_path, force)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error generating images: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"🖼️ Image generation completed!\n\nOutput:\n{stdout}\n\n"
                         f"Visit {MULMOCAST_CLIENT_URL} to view the generated images."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Image generation failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_generate_movie":
            script_path = arguments["script_path"]
            force = arguments.get("force", False)
            
            result = service.generate_movie(script_path, force)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error generating movie: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"🎬 Movie generation completed!\n\nOutput:\n{stdout}\n\n"
                         f"Visit {MULMOCAST_CLIENT_URL} to download the video files."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Movie generation failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_generate_pdf":
            script_path = arguments["script_path"]
            force = arguments.get("force", False)
            
            result = service.generate_pdf(script_path, force)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error generating PDF: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"📄 PDF generation completed!\n\nOutput:\n{stdout}\n\n"
                         f"Visit {MULMOCAST_CLIENT_URL} to download the PDF files."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ PDF generation failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_list_files":
            result = service.list_files()
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error listing files: {result['error']}"
                )]
            
            if isinstance(result, list) and len(result) == 0:
                return [TextContent(
                    type="text",
                    text="No files have been generated yet. Create content using the MulmoCast tools first."
                )]
            
            if isinstance(result, list):
                files_text = "\n".join([f"• {file['name']} ({file['path']}) - {file['size']/1024:.1f}KB" for file in result])
                return [TextContent(
                    type="text",
                    text=f"Generated files:\n{files_text}\n\nVisit {MULMOCAST_CLIENT_URL} to download files."
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"Files:\n{json.dumps(result, indent=2)}"
                )]
        
        elif name == "mulmocast_execute_command":
            command = arguments["command"]
            args = arguments.get("args", [])
            
            result = service.execute_cli_command(command, args)
            
            if "error" in result:
                return [TextContent(
                    type="text",
                    text=f"Error executing command: {result['error']}"
                )]
            
            success = result.get("success", False)
            stdout = result.get("stdout", "")
            stderr = result.get("stderr", "")
            
            if success:
                return [TextContent(
                    type="text",
                    text=f"✅ Command executed successfully!\n\nOutput:\n{stdout}"
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Command failed!\n\nError:\n{stderr or stdout}"
                )]
        
        elif name == "mulmocast_create_complete_workflow":
            template = arguments["template"]
            topic = arguments["topic"]
            output_formats = arguments.get("output_formats", ["movie"])
            urls = arguments.get("urls", [])
            
            # Step 1: Generate script
            script_result = service.generate_script(template, topic, urls)
            
            if "error" in script_result or not script_result.get("success"):
                error_msg = script_result.get("error") or script_result.get("stderr", "Unknown error")
                return [TextContent(
                    type="text",
                    text=f"❌ Script generation failed: {error_msg}"
                )]
            
            # Extract script path from output (this is a simplification)
            script_path = f"output/{topic.replace(' ', '_')}.json"
            
            results = [f"📝 Script generated successfully for topic: {topic}"]
            
            # Step 2: Generate each requested format
            for format_type in output_formats:
                if format_type == "audio":
                    result = service.generate_audio(script_path)
                elif format_type == "images":
                    result = service.generate_images(script_path)
                elif format_type == "movie":
                    result = service.generate_movie(script_path)
                elif format_type == "pdf":
                    result = service.generate_pdf(script_path)
                else:
                    results.append(f"❓ Unknown format: {format_type}")
                    continue
                
                if result.get("success"):
                    results.append(f"✅ {format_type.title()} generation completed")
                else:
                    error_msg = result.get("error") or result.get("stderr", "Unknown error")
                    results.append(f"❌ {format_type.title()} generation failed: {error_msg}")
            
            results.append(f"\n🌐 Visit {MULMOCAST_CLIENT_URL} to download your content.")
            
            return [TextContent(
                type="text",
                text="\n".join(results)
            )]
        
        else:
            return [TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]
    
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return [TextContent(
            type="text",
            text=f"Error executing {name}: {str(e)}"
        )]

async def main():
    """Run the MCP server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())