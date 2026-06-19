"""
FastAPI routes for the agent subsystem.

Endpoints:
    GET  /api/agents/             -- list all agents
    GET  /api/agents/categories   -- list categories with counts
    GET  /api/agents/{slug}       -- get single agent details
    POST /api/agents/{slug}/chat  -- synchronous chat
    POST /api/agents/{slug}/chat/stream -- SSE streaming chat
    WS   /api/agents/ws/{slug}/{session_id} -- WebSocket chat
"""

from __future__ import annotations

import base64
import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.engine import AgentEngine
from app.agents.registry import AgentRegistry

logger = logging.getLogger("agents.routes")

# ------------------------------------------------------------------
# Module-level singletons -- set by ``configure_routes()`` at startup
# ------------------------------------------------------------------
_registry: AgentRegistry | None = None
_engine: AgentEngine | None = None

router = APIRouter(prefix="/api/agents", tags=["agents"])


def configure_routes(
    registry: AgentRegistry,
    engine: AgentEngine,
) -> None:
    """
    Inject dependencies into this module.

    Called once at application startup from ``main.py`` (or wherever the
    FastAPI ``app`` is assembled).
    """
    global _registry, _engine  # noqa: PLW0603
    _registry = registry
    _engine = engine
    logger.info("Agent routes configured")


def _get_registry() -> AgentRegistry:
    if _registry is None:
        raise RuntimeError(
            "AgentRegistry not initialised. Call configure_routes() at startup."
        )
    return _registry


def _get_engine() -> AgentEngine:
    if _engine is None:
        raise RuntimeError(
            "AgentEngine not initialised. Call configure_routes() at startup."
        )
    return _engine


# ------------------------------------------------------------------
# Request / Response models
# ------------------------------------------------------------------

class Attachment(BaseModel):
    """A multimodal attachment (image, PDF, etc.)."""
    type: str = Field(default="image", description="Attachment type: image, file")
    media_type: str = Field(default="image/png", description="MIME type, e.g. image/png, image/jpeg, application/pdf")
    data: str = Field(..., description="Base64-encoded file content")
    filename: str | None = Field(default=None, description="Original filename")


class ChatRequest(BaseModel):
    """Payload for synchronous and streaming chat endpoints."""
    message: str = Field(..., min_length=1, max_length=32_000)
    session_id: str | None = Field(
        default=None,
        description="Existing session ID. A new UUID is generated when omitted.",
    )
    history: list[dict[str, Any]] | None = Field(
        default=None,
        description="Prior conversation messages in the LLM provider's native format.",
    )
    attachments: list[Attachment] | None = Field(
        default=None,
        description="Multimodal attachments (images, files) to include with the message.",
    )


class ChatResponse(BaseModel):
    """Full response from the synchronous chat endpoint."""
    response: str
    session_id: str
    model: str
    turns: int
    tool_calls: list[dict[str, Any]]
    usage: dict[str, Any]


# File extensions that are always text, even if the browser says application/octet-stream
_TEXT_EXTENSIONS = {
    ".md", ".markdown", ".txt", ".text", ".csv", ".tsv",
    ".json", ".jsonl", ".yaml", ".yml", ".xml",
    ".html", ".htm", ".css", ".js", ".ts", ".jsx", ".tsx",
    ".py", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h",
    ".sh", ".bash", ".zsh", ".fish", ".bat", ".ps1",
    ".sql", ".r", ".m", ".swift", ".kt", ".scala",
    ".toml", ".ini", ".cfg", ".conf", ".env", ".log",
    ".rst", ".tex", ".bib", ".svg",
}

# MIME types that are text-based
_TEXT_MIMES = {
    "application/json", "application/xml", "application/yaml",
    "application/x-yaml", "application/toml",
    "application/javascript", "application/typescript",
    "application/x-sh", "application/sql",
}


def _is_text_content(media_type: str, filename: str) -> bool:
    """Check if a file should be treated as text content."""
    if media_type.startswith("text/"):
        return True
    if media_type in _TEXT_MIMES:
        return True
    # Check file extension as fallback
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in _TEXT_EXTENSIONS


def _build_user_content(
    message: str,
    attachments: list[dict[str, Any]] | None = None,
) -> str | list[dict[str, Any]]:
    """
    Build the user message content, either as a plain string or as a list of
    multimodal content blocks when attachments are present.

    Uses a unified format that providers convert to their native format:
    - {"type": "text", "text": "..."}
    - {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "..."}}
    """
    if not attachments:
        return message

    content_blocks: list[dict[str, Any]] = []

    # Add attachments first so the model "sees" them before the text
    for att in attachments:
        att_type = att.get("type", "image")
        media_type = att.get("media_type", "image/png")
        data = att.get("data", "")
        filename = att.get("filename", "attachment")

        if att_type == "image" or media_type.startswith("image/"):
            content_blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": data,
                },
            })
        elif media_type == "application/pdf":
            # PDFs: supported natively by Claude, OpenAI, and Gemini
            content_blocks.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": data,
                },
                "filename": filename,
            })
        elif _is_text_content(media_type, filename):
            # Text-based files: decode and include as text content
            try:
                decoded_text = base64.b64decode(data).decode("utf-8")
                content_blocks.append({
                    "type": "text",
                    "text": f"--- Content of {filename} ({media_type}) ---\n{decoded_text}\n--- End of {filename} ---",
                })
            except Exception:
                content_blocks.append({
                    "type": "text",
                    "text": f"[Attached file: {filename} ({media_type}) — could not decode as text]",
                })
        else:
            # Binary documents (docx, xlsx, pptx, etc.): try to decode as
            # text first (in case MIME type is wrong), else pass as document
            try:
                decoded_text = base64.b64decode(data).decode("utf-8")
                # Successfully decoded as text — include inline
                content_blocks.append({
                    "type": "text",
                    "text": f"--- Content of {filename} ({media_type}) ---\n{decoded_text}\n--- End of {filename} ---",
                })
            except (UnicodeDecodeError, Exception):
                # Truly binary — pass as document block
                content_blocks.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": data,
                    },
                    "filename": filename,
                })

    # Add the text message last
    if message:
        content_blocks.append({"type": "text", "text": message})

    return content_blocks


# ------------------------------------------------------------------
# REST endpoints
# ------------------------------------------------------------------

@router.get("/")
async def list_agents():
    """List all registered agents with metadata (excludes system_prompt)."""
    registry = _get_registry()
    return [agent.to_dict() for agent in registry.list_all()]


@router.get("/categories")
async def list_categories():
    """List agent categories with counts."""
    registry = _get_registry()
    return registry.categories()


@router.get("/{slug}")
async def get_agent(slug: str):
    """Get full details for a single agent by slug."""
    registry = _get_registry()
    agent = registry.get(slug)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")
    return agent.to_dict()


@router.post("/{slug}/chat", response_model=ChatResponse)
async def chat_with_agent(slug: str, request: ChatRequest):
    """
    Send a message to an agent and receive the complete response.

    The engine will loop through tool calls internally and return
    when the agent produces a final text response or exhausts its
    turn budget.
    """
    registry = _get_registry()
    engine = _get_engine()

    if not registry.get(slug):
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")

    session_id = request.session_id or str(uuid.uuid4())

    # Build multimodal content if attachments present
    attachments = [a.model_dump() for a in request.attachments] if request.attachments else None
    user_content = _build_user_content(request.message, attachments)

    try:
        result = await engine.run(
            agent_slug=slug,
            session_id=session_id,
            user_message=user_content,
            history=request.history,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("chat_with_agent failed for %s", slug)
        raise HTTPException(status_code=500, detail=f"Agent execution error: {exc}")

    return ChatResponse(session_id=session_id, **result)


@router.post("/{slug}/chat/stream")
async def chat_stream(slug: str, request: ChatRequest):
    """
    Send a message to an agent and receive a Server-Sent Events stream.

    Each SSE ``data:`` line contains a JSON event dict. The final event
    is ``data: [DONE]``.
    """
    registry = _get_registry()
    engine = _get_engine()

    if not registry.get(slug):
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")

    session_id = request.session_id or str(uuid.uuid4())

    attachments = [a.model_dump() for a in request.attachments] if request.attachments else None
    user_content = _build_user_content(request.message, attachments)

    async def event_generator():
        try:
            async for event in engine.run_stream(
                agent_slug=slug,
                session_id=session_id,
                user_message=user_content,
                history=request.history,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            logger.exception("chat_stream failed for %s", slug)
            error_event = {"type": "error", "error": str(exc)}
            yield f"data: {json.dumps(error_event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ------------------------------------------------------------------
# WebSocket endpoint
# ------------------------------------------------------------------

@router.websocket("/ws/{slug}/{session_id}")
async def agent_websocket(websocket: WebSocket, slug: str, session_id: str):
    """
    WebSocket endpoint for real-time bidirectional agent interaction.

    The client sends JSON messages with a ``message`` field.  The server
    streams back event dicts for each turn.  Conversation history is
    maintained server-side for the lifetime of the connection.
    """
    registry = _get_registry()
    engine = _get_engine()

    if not registry.get(slug):
        await websocket.close(code=4004, reason=f"Agent not found: {slug}")
        return

    await websocket.accept()
    logger.info(
        "WebSocket opened for agent %r session %s", slug, session_id
    )

    history: list[dict[str, Any]] = []

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "").strip()
            attachments = data.get("attachments")  # list of {type, media_type, data, filename}

            if not message and not attachments:
                await websocket.send_json({
                    "type": "error",
                    "error": "Empty message",
                })
                continue

            # Build multimodal content blocks when attachments are present
            user_content = _build_user_content(message, attachments)

            # Append user message to persistent history
            history.append({"role": "user", "content": user_content})

            final_response = ""
            async for event in engine.run_stream(
                agent_slug=slug,
                session_id=session_id,
                user_message=user_content,
                history=history[:-1],  # Engine adds user msg internally
            ):
                await websocket.send_json(event)

                # Accumulate the final text response to update history
                if event.get("type") == "text_delta":
                    final_response += event.get("content", "")

            # Update history with the assistant response
            if final_response:
                history.append({
                    "role": "assistant",
                    "content": final_response,
                })

    except WebSocketDisconnect:
        logger.info(
            "WebSocket closed for agent %r session %s", slug, session_id
        )
    except Exception as exc:
        logger.exception(
            "WebSocket error for agent %r session %s", slug, session_id
        )
        try:
            await websocket.send_json({
                "type": "error",
                "error": f"Internal error: {exc}",
            })
            await websocket.close(code=1011)
        except Exception:
            pass
