"""
MCP Wrapper for Humans-in-Control Research App
Provides JSON-RPC 2.0 interface for the Research tool.

The Research app is a browser-based React SPA powered by Google Gemini AI.
All analysis happens client-side — the MCP wrapper provides tool metadata
and a launch URL so the agent can direct users to the app.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import requests
import json
import os
import logging
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Service URL (internal Docker network)
RESEARCH_GENERATOR_URL = os.getenv("RESEARCH_GENERATOR_URL", "http://research-generator:5011")
RESEARCH_GENERATOR_CLIENT_URL = os.getenv("RESEARCH_GENERATOR_CLIENT_URL", "http://localhost:5011")
PORT = int(os.getenv("PORT", "8507"))

# Tool definitions following MCP spec
RESEARCH_TOOLS = [
    {
        "name": "launch_research_app",
        "description": (
            "Launch the Humans-in-Control Research app for AI-augmented market research analysis. "
            "This is a browser-based tool powered by Google Gemini that transforms uploaded documents "
            "(PDFs, CSVs, text) into professional research deliverables through a multi-stage pipeline "
            "with human checkpoints at every stage. "
            "Outputs include: personas with 5-W profiles, strategy decks (PPTX), video scripts, "
            "journey maps, PRDs, strategic roadmaps, technical architecture diagrams, and "
            "management consulting recommendations. "
            "Direct the user to open the app in their browser to upload files and run analysis."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "research_goal": {
                    "type": "string",
                    "description": "The research objective to share with the user when directing them to the app"
                }
            },
            "required": []
        }
    }
]

# JSON-RPC models
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    method: str
    params: Optional[Dict[str, Any]] = {}

class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Any] = None
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health_check():
    """Health check endpoint — verifies the research app frontend is reachable"""
    try:
        response = requests.get(f"{RESEARCH_GENERATOR_URL}/", timeout=5)
        research_healthy = response.status_code == 200
    except Exception:
        research_healthy = False

    return {
        "status": "healthy" if research_healthy else "degraded",
        "service": "research-mcp",
        "research_generator_status": "connected" if research_healthy else "disconnected"
    }

@app.post("/mcp", response_model=JSONRPCResponse)
async def handle_mcp_request(request: JSONRPCRequest):
    """Handle MCP JSON-RPC 2.0 requests"""

    logger.info(f"Received MCP request: method={request.method}")

    if request.method == "tools/list":
        return JSONRPCResponse(
            jsonrpc="2.0",
            id=request.id,
            result={"tools": RESEARCH_TOOLS}
        )

    elif request.method == "tools/call":
        tool_name = request.params.get("name")
        arguments = request.params.get("arguments", {})

        logger.info(f"Executing tool: {tool_name}")

        if tool_name == "launch_research_app":
            research_goal = arguments.get("research_goal", "")
            message = (
                f"The Humans-in-Control Research app is available at: {RESEARCH_GENERATOR_CLIENT_URL}\n\n"
                "This browser-based tool lets you:\n"
                "1. Upload research documents (PDF, CSV, text files)\n"
                "2. Run AI-powered analysis with human checkpoints at every stage\n"
                "3. Generate deliverables: personas, strategy decks, video scripts, "
                "journey maps, PRDs, roadmaps, tech architecture, and strategic recommendations\n"
                "4. Export results as PDF, PowerPoint, or JSON\n"
            )
            if research_goal:
                message += f"\nResearch objective: {research_goal}"

            return JSONRPCResponse(
                jsonrpc="2.0",
                id=request.id,
                result={"content": [{"type": "text", "text": message}]}
            )
        else:
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=request.id,
                error={
                    "code": -32601,
                    "message": f"Unknown tool: {tool_name}"
                }
            )

    else:
        return JSONRPCResponse(
            jsonrpc="2.0",
            id=request.id,
            error={
                "code": -32601,
                "message": f"Method not found: {request.method}"
            }
        )

# Legacy endpoints for compatibility
@app.get("/mcp/tools")
async def get_tools():
    """Legacy endpoint: Get available tools"""
    return RESEARCH_TOOLS

@app.post("/mcp/invoke/{tool_name}")
async def invoke_tool_legacy(tool_name: str, request: Request):
    """Legacy endpoint: Invoke a tool"""
    from fastapi import HTTPException
    params = await request.json() if request.headers.get("content-type") == "application/json" else {}

    mcp_request = JSONRPCRequest(
        method="tools/call",
        params={"name": tool_name, "arguments": params}
    )

    response = await handle_mcp_request(mcp_request)

    if response.error:
        raise HTTPException(status_code=400, detail=response.error["message"])

    return response.result

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Research MCP wrapper on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
