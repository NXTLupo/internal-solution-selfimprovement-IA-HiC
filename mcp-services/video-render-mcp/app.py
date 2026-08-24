"""
MCP Wrapper for the HiC Video Renderer (E3.1, 2026-08-21).

Exposes the HTML-to-video render sidecar as agent tools over JSON-RPC 2.0, following the
same shape as the other wrappers in mcp-services/.

Two tools, and the split between them is the point:

  lint_composition  inspects a composition and costs nothing
  render_composition spends minutes of CPU and burns text into pixels

An agent should always lint first. A render bakes copy into frames, and a frame cannot be
repaired by a later pass, so every anti-slop rule has to hold BEFORE capture rather than
after it. The service refuses a composition that carries an em-dash, a provider artifact
tag, an emoji, a raw manifest pointer or a banned phrase; this wrapper surfaces that
refusal as a result rather than an error, so the model can fix the copy and retry.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any
import os
import logging
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

VIDEO_RENDERER_URL = os.getenv("VIDEO_RENDERER_URL", "http://video-renderer:4600")
PORT = int(os.getenv("PORT", "8508"))

# A render is minutes of work, so the wrapper never waits for it: /render returns a job
# id and the agent polls. Only the short calls get a real timeout here.
SHORT_TIMEOUT = 30

TOOLS = [
    {
        "name": "lint_composition",
        "description": (
            "Inspect a HyperFrames HTML composition WITHOUT rendering it. Returns the "
            "problems that would refuse a render: em-dashes, provider artifact tags, "
            "emoji, raw manifest pointers, banned phrases, a missing paused timeline. "
            "Always call this before render_composition: linting is free and a render is "
            "minutes of CPU that bakes the copy into pixels permanently."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "html": {"type": "string", "description": "The full composition HTML."},
            },
            "required": ["html"],
        },
    },
    {
        "name": "render_composition",
        "description": (
            "Render a HyperFrames HTML composition to an MP4. The composition must carry "
            "a data-composition-id root and a PAUSED, seekable window.__timelines entry; "
            "without one every frame is identical and the render reports success anyway. "
            "Returns a job id immediately because a 60-second 1080p render takes minutes. "
            "Poll render_status until it is done, then fetch the returned url."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "html": {"type": "string", "description": "The full composition HTML."},
                "assets": {
                    "type": "object",
                    "description": "Optional { filename: base64 } images the composition references as assets/<filename>.",
                },
                "fps": {"type": "integer", "description": "Frames per second, default 30."},
                "quality": {
                    "type": "string",
                    "enum": ["draft", "standard", "high"],
                    "description": "draft for a fast check, high for anything a client sees.",
                },
            },
            "required": ["html"],
        },
    },
    {
        "name": "render_status",
        "description": "Progress for one render job: queued, rendering, done or error, plus the output url when finished.",
        "inputSchema": {
            "type": "object",
            "properties": {"jobId": {"type": "string"}},
            "required": ["jobId"],
        },
    },
]


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Report the wrapper AND whether the renderer behind it is reachable: a healthy
    wrapper in front of a dead service is the failure mode a health check exists to
    catch."""
    downstream = "unreachable"
    try:
        r = requests.get(f"{VIDEO_RENDERER_URL}/health", timeout=5)
        if r.ok:
            downstream = r.json().get("status", "unknown")
    except Exception as exc:  # noqa: BLE001 - any failure means unreachable
        logger.warning("video-renderer health check failed: %s", exc)
    return {"status": "healthy", "service": "video-render-mcp", "renderer": downstream}


def _call(method: str, path: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    url = f"{VIDEO_RENDERER_URL}{path}"
    try:
        if method == "GET":
            resp = requests.get(url, timeout=SHORT_TIMEOUT)
        else:
            resp = requests.post(url, json=payload or {}, timeout=SHORT_TIMEOUT)
    except requests.RequestException as exc:
        return {"error": f"video renderer unreachable: {exc}"}
    try:
        body = resp.json()
    except ValueError:
        return {"error": f"video renderer returned non-JSON ({resp.status_code})"}
    # A 422 is the content gate refusing, which is a RESULT the model should act on, not
    # a transport failure. Passing it through as data is what lets the agent fix the copy.
    if resp.status_code >= 400 and resp.status_code != 422:
        body.setdefault("error", f"video renderer returned {resp.status_code}")
    return body


@app.post("/")
async def rpc(request: Request) -> JSONResponse:
    body = await request.json()
    method = body.get("method")
    req_id = body.get("id")

    if method == "tools/list":
        return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}})

    if method == "tools/call":
        params = body.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}

        if name == "lint_composition":
            result = _call("POST", "/lint", {"html": args.get("html", "")})
        elif name == "render_composition":
            result = _call("POST", "/render", {
                "html": args.get("html", ""),
                "assets": args.get("assets") or {},
                "fps": args.get("fps") or 30,
                "quality": args.get("quality") or "high",
            })
        elif name == "render_status":
            job_id = str(args.get("jobId", "")).strip()
            result = {"error": "jobId is required"} if not job_id else _call("GET", f"/render/{job_id}")
        else:
            return JSONResponse({
                "jsonrpc": "2.0", "id": req_id,
                "error": {"code": -32601, "message": f"unknown tool '{name}'"},
            })

        return JSONResponse({"jsonrpc": "2.0", "id": req_id, "result": result})

    return JSONResponse({
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"unknown method '{method}'"},
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
