"""
Launchpad Compatibility Layer
-----------------------------
Provides the same API surface as the original CX Workbench Agent (port 8500)
so the Launchpad hub can proxy to the NXT Agency backend without changes.

Endpoints:
    POST /api/chat/conversation     -- create a new conversation
    POST /api/chat/message          -- send a message (multipart/form-data with optional file)
    GET  /api/chat/ws/{id}          -- WebSocket info (deprecated)
    WS   /ws/{conversation_id}      -- WebSocket real-time chat with file upload support
    POST /refresh-tools             -- refresh tool cache (no-op for compatibility)

Multimodal support:
    - Images (PNG, JPG, GIF, WebP) → sent as vision content blocks
    - PDFs → extracted text or sent as document blocks
    - Text files (CSV, TXT, JSON, MD) → inlined as text content
    - Other files → stored and referenced by path

This layer uses the NXT Agency AgentEngine with a dedicated "launchpad-agent"
slug that has access to all tools (tier 4) and the Multi-Agent OS orchestration.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import tempfile
import uuid
from typing import Any, Dict, Optional

import anthropic
import httpx

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.agents.engine import AgentEngine
from app.agents.registry import AgentRegistry

logger = logging.getLogger("agents.launchpad-compat")

# Module-level singletons
_engine: AgentEngine | None = None
_registry: AgentRegistry | None = None

# In-memory conversation state (mirrors the original CX Agent)
_conversations: Dict[str, dict] = {}
_uploaded_files: Dict[str, str] = {}

router = APIRouter(tags=["launchpad-compat"])

# The agent slug used for launchpad conversations
LAUNCHPAD_AGENT_SLUG = "nxt-intelligence-agent"
# Fallback if primary doesn't exist
FALLBACK_AGENT_SLUG = "agents-orchestrator"

# Image MIME types that Claude can process as vision
_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
# Text-like MIME types that can be inlined
_TEXT_TYPES = {
    "text/plain", "text/csv", "text/markdown", "text/html",
    "application/json", "application/xml",
}

# ---------------------------------------------------------------------------
# P0 INNOVATION: AI-Powered Parameter Extraction + Confirmation
# Replaces fragile regex parsing with a single fast Haiku call per shortcut.
# Applies prompt engineering techniques: /constrain, /lock-format, /guard
# ---------------------------------------------------------------------------

# Tool-specific parameter schemas (Innovation #2: Constraint-Locked Schemas)
# Every field has an explicit type, range, and default. The AI extraction
# prompt references this schema so output format never drifts.
TOOL_SCHEMAS = {
    "reddit": {
        "required": ["subreddit"],
        "optional": {
            "count": {"type": "int", "range": [1, 500], "default": 25, "label": "Number of posts"},
            "time_filter": {
                "type": "enum",
                "values": ["day", "week", "month", "year", "all"],
                "default": "week",
                "label": "Time range",
            },
            "comments_per_post": {"type": "int", "range": [0, 100], "default": 5, "label": "Comments per post"},
        },
    },
    "video_transcribe": {
        "required": ["youtube_url OR file_path"],
        "optional": {},
    },
    "copilot_recipe": {
        "required": ["description"],
        "optional": {
            "template": {"type": "string", "default": "auto-detect", "label": "Template"},
        },
    },
    "character_gen": {
        "required": ["name"],
        "optional": {
            "description": {"type": "string", "default": "", "label": "Character description"},
        },
    },
}

# Extraction prompts per tool (Innovation #1 + #3 + #4 + #5)
# Technique applied: /constrain (every rule is measurable, not vague)
# Technique applied: /lock-format (exact JSON schema, no drift)
_EXTRACTION_PROMPTS = {
    "reddit": """Extract parameters from this user request for a Reddit data collector.

Return ONLY valid JSON matching this exact schema (no markdown fencing, no commentary):
{"subreddit": "string or null", "count": "integer or null", "time_filter": "string or null", "comments_per_post": "integer or null"}

SUBREDDIT EXTRACTION:
- If user writes "r/name", extract "name" (without the r/ prefix)
- If user writes "the X subreddit" or "from X" where X is a subreddit, extract X
- If user writes a topic with spaces like "skincare addiction", join to "skincareaddiction"
- Remove spaces and special characters from subreddit names
- If no subreddit is identifiable, return null

TIME EXPRESSION MAPPING (use these exact rules):
- "today" / "24 hours" / "last day" / "past day" -> "day"
- "this week" / "last week" / "past week" / "7 days" / "past 7 days" / "recent" / "lately" / "recently" -> "week"
- "this month" / "last month" / "past month" / "30 days" / "past 30 days" -> "month"
- "this year" / "last year" / "past year" / "12 months" -> "year"
- "all time" / "ever" / "all" -> "all"
- "couple of weeks" / "few weeks" -> "month"
- "since Monday" / "since [day name]" -> "week"
- If user says NOTHING about time, return null (NOT "year")
- DEFAULT WHEN AMBIGUOUS: "week" (NOT "year")

QUANTITY MAPPING:
- Exact numbers: use as-is, capped at 500
- "a dozen" -> 12, "a handful" / "a few" -> 10
- "lots" / "many" / "a bunch" -> 100
- "as many as possible" / "all" / "everything" -> 500
- "the top N" -> count: N
- If no quantity mentioned, return null

COMMENTS MAPPING:
- Exact number: use as-is, capped at 100
- "with comments" / "include comments" -> 10
- "no comments" / "without comments" -> 0
- If not mentioned, return null

User request: {message}""",

    "video_transcribe": """Extract parameters from this user request for a video transcription tool.

Return ONLY valid JSON (no markdown fencing, no commentary):
{"youtube_url": "string or null", "file_path": "string or null"}

RULES:
- Extract any YouTube URL (youtube.com/watch?v=... or youtu.be/...)
- If user mentions an uploaded file, set file_path to "uploaded" (the system will resolve the actual path)
- If neither is found, return nulls

User request: {message}""",

    "copilot_recipe": """Extract parameters from this user request for a Copilot Studio recipe builder.

Return ONLY valid JSON (no markdown fencing, no commentary):
{"description": "string", "template": "string or null"}

RULES:
- description: The full user request describing what bot/agent they want to build
- template: If user mentions a specific template name, extract it. Otherwise null.

User request: {message}""",

    "character_gen": """Extract parameters from this user request for a character image generator.

Return ONLY valid JSON (no markdown fencing, no commentary):
{"name": "string or null", "description": "string or null"}

RULES:
- name: Extract character name if explicitly stated ("named X", "called X", "name it X"). If not stated, return null.
- description: Extract the character description (appearance, traits, style). Strip instructional verbs like "generate", "create", "make".

User request: {message}""",
}

# Lazy-initialized Anthropic client for parameter extraction
_extraction_client: anthropic.AsyncAnthropic | None = None


def _get_extraction_client() -> anthropic.AsyncAnthropic:
    """Get or create the Anthropic client for fast parameter extraction."""
    global _extraction_client
    if _extraction_client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        _extraction_client = anthropic.AsyncAnthropic(api_key=api_key)
    return _extraction_client


async def _ai_extract_params(message: str, tool_name: str) -> dict:
    """Use Claude Haiku to extract structured parameters from a natural language message.

    Innovation #1: Replaces all regex parsing with a single fast LLM call.
    Cost: ~$0.001 per call. Latency: ~200-400ms.

    Returns a dict of extracted parameters. Null values mean "not mentioned by user".
    """
    prompt_template = _EXTRACTION_PROMPTS.get(tool_name)
    if not prompt_template:
        return {}

    prompt = prompt_template.replace("{message}", message)

    try:
        client = _get_extraction_client()
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Strip markdown fencing if model adds it despite instructions
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
    except Exception as e:
        logger.warning("AI param extraction failed for %s: %s — falling back to empty", tool_name, e)
        return {}


def _apply_defaults(params: dict, tool_name: str) -> dict:
    """Apply schema defaults for any parameter the AI returned as null.

    Innovation #2: Constraint-locked defaults from TOOL_SCHEMAS.
    Only applies defaults for null values (user didn't mention the parameter).
    """
    schema = TOOL_SCHEMAS.get(tool_name, {})
    result = dict(params)
    for field, spec in schema.get("optional", {}).items():
        if result.get(field) is None:
            result[field] = spec["default"]
    return result


def _validate_params(params: dict, tool_name: str) -> list[str]:
    """Validate extracted parameters against schema constraints.

    Innovation #12: Parameter range validation (guard technique).
    Returns list of issues. Empty list = all valid.
    """
    schema = TOOL_SCHEMAS.get(tool_name, {})
    issues = []
    for field, spec in schema.get("optional", {}).items():
        value = params.get(field)
        if value is None:
            continue
        if spec["type"] == "int":
            try:
                v = int(value)
                lo, hi = spec.get("range", [0, 999999])
                if not (lo <= v <= hi):
                    issues.append(f"{field}={v} is outside range [{lo}, {hi}]")
            except (ValueError, TypeError):
                issues.append(f"{field}={value} is not a valid integer")
        elif spec["type"] == "enum":
            if value not in spec.get("values", []):
                issues.append(f"{field}={value} is not one of {spec['values']}")
    return issues


async def _send_confirmation_card(
    ws, tool_name: str, display_name: str, params: dict, schema: dict,
) -> None:
    """Send a pre-execution confirmation card to the user via WebSocket.

    Innovation #6: The user sees exactly what will happen before execution.
    Shows extracted values + defaults, lets user confirm or correct.
    """
    lines = [f"I'm about to run **{display_name}** with these settings:\n"]

    # Show explicitly extracted values
    for key, value in params.items():
        if value is None:
            continue
        # Find the label from schema
        opt_spec = schema.get("optional", {}).get(key, {})
        label = opt_spec.get("label", key)
        lines.append(f"  - **{label}**: `{value}`")

    # Show defaults being applied
    for key, spec in schema.get("optional", {}).items():
        if params.get(key) is None:
            label = spec.get("label", key)
            lines.append(f"  - **{label}**: `{spec['default']}` *(default)*")

    lines.append("\nLooks good? Say **yes** to proceed, or tell me what to change.")

    await ws.send_json({
        "type": "text_delta",
        "content": "\n".join(lines),
    })
    await ws.send_json({
        "type": "message_complete",
        "turns": 1,
        "tools_used": [],
    })


def _is_confirmation(message: str) -> bool:
    """Check if a user message is confirming a pending action."""
    confirmations = [
        "yes", "yeah", "yep", "yup", "sure", "go", "go ahead", "proceed",
        "do it", "looks good", "looks right", "correct", "confirmed", "ok",
        "okay", "lgtm", "ship it", "run it", "execute", "start",
    ]
    msg = message.strip().lower().rstrip("!.")
    return msg in confirmations


def _is_cancellation(message: str) -> bool:
    """Check if a user message is cancelling a pending action."""
    cancellations = ["no", "cancel", "stop", "never mind", "nevermind", "abort", "wait"]
    msg = message.strip().lower().rstrip("!.")
    return msg in cancellations


async def _handle_pending_confirmation(ws, conv: dict, user_message: str) -> bool:
    """Handle a pending confirmation from a previous extraction.

    Returns True if we handled the message (caller should `continue`).
    Returns False if no pending confirmation exists.
    """
    pending = conv.get("_pending_confirmation")
    if not pending:
        return False

    if _is_cancellation(user_message):
        conv.pop("_pending_confirmation", None)
        await ws.send_json({
            "type": "text_delta",
            "content": "Cancelled. What else can I help with?",
        })
        await ws.send_json({"type": "message_complete", "turns": 1, "tools_used": []})
        return True

    if _is_confirmation(user_message):
        # User confirmed -- pop the pending state and return False
        # so the caller can execute with the confirmed params.
        # The params are stored in conv["_confirmed_execution"]
        conv["_confirmed_execution"] = conv.pop("_pending_confirmation")
        return False  # Let the shortcut logic re-detect and execute

    # User sent a correction -- re-extract with the new message appended
    tool_name = pending["tool"]
    original_msg = pending["original_message"]
    correction_prompt = f"{original_msg}. Also: {user_message}"

    new_params = await _ai_extract_params(correction_prompt, tool_name)

    # Merge: correction overrides original, but keep originals for unmentioned fields
    merged = dict(pending["params"])
    for k, v in new_params.items():
        if v is not None:
            merged[k] = v

    # Validate
    issues = _validate_params(merged, tool_name)
    if issues:
        await ws.send_json({
            "type": "text_delta",
            "content": f"There's an issue with the parameters: {', '.join(issues)}. Can you clarify?",
        })
        await ws.send_json({"type": "message_complete", "turns": 1, "tools_used": []})
        return True

    # Show updated confirmation
    schema = TOOL_SCHEMAS.get(tool_name, {})
    merged_with_defaults = _apply_defaults(merged, tool_name)
    conv["_pending_confirmation"] = {
        "tool": tool_name,
        "display_name": pending["display_name"],
        "params": merged,
        "params_with_defaults": merged_with_defaults,
        "original_message": original_msg,
    }
    await _send_confirmation_card(ws, tool_name, pending["display_name"], merged, schema)
    conv["history"].append({"role": "user", "content": user_message})
    conv["history"].append({"role": "assistant", "content": "(Updated confirmation card)"})
    return True


async def _deliver_pending_journey(ws, conv_ref: dict) -> bool:
    """Deliver a pending journey map result via WebSocket. Returns True if delivered."""
    pending = conv_ref.pop("_pending_journey", None)
    if not pending:
        return False
    url = pending["url"]
    try:
        if pending.get("screenshot"):
            await ws.send_json({
                "type": "screenshot",
                "tool": "generate_journey_map",
                "image": pending["screenshot"],
                "url": url,
            })
        await ws.send_json({
            "type": "text_delta",
            "content": f"\n\nYour journey map is ready! View it here: {url}",
        })
        await ws.send_json({
            "type": "message_complete",
            "turns": 0,
            "tools_used": [],
        })
        logger.info("Delivered pending journey map result: %s", url)
        return True
    except Exception as e:
        # Put it back if delivery failed
        conv_ref["_pending_journey"] = pending
        logger.warning("Failed to deliver pending journey: %s", e)
        return False


# Serve generated images via HTTP (avoids WebSocket size issues)
_generated_images: Dict[str, str] = {}  # id -> file_path


@router.get("/api/chat/image/{image_id}")
async def serve_generated_image(image_id: str):
    """Serve a generated file (image, recipe, etc.) by ID."""
    from fastapi.responses import FileResponse
    fpath = _generated_images.get(image_id)
    if not fpath or not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="File not found")
    # Determine media type from extension
    ext = os.path.splitext(fpath)[1].lower()
    media_types = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".md": "text/markdown", ".txt": "text/plain",
        ".yaml": "text/yaml", ".yml": "text/yaml",
        ".json": "application/json", ".html": "text/html",
        ".pdf": "application/pdf",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    # For downloadable files (non-images), set Content-Disposition to attachment
    filename = os.path.basename(fpath)
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        return FileResponse(fpath, media_type=media_type, filename=filename)
    return FileResponse(fpath, media_type=media_type)


def configure_launchpad_compat(registry: AgentRegistry, engine: AgentEngine) -> None:
    """Wire dependencies at startup."""
    global _engine, _registry
    _engine = engine
    _registry = registry
    logger.info("Launchpad compatibility layer configured")


def _get_engine() -> AgentEngine:
    if _engine is None:
        raise RuntimeError("Engine not initialized")
    return _engine


def _get_agent_slug() -> str:
    """Get the best agent slug for launchpad conversations."""
    if _registry and _registry.get(LAUNCHPAD_AGENT_SLUG):
        return LAUNCHPAD_AGENT_SLUG
    if _registry and _registry.get(FALLBACK_AGENT_SLUG):
        return FALLBACK_AGENT_SLUG
    # Return whatever first agent exists
    if _registry:
        agents = _registry.list_all()
        if agents:
            return agents[0].slug
    return LAUNCHPAD_AGENT_SLUG


def _build_multimodal_content(message: str, file_path: str | None = None) -> str | list[dict]:
    """Build a multimodal content payload from text + optional file.

    Returns a plain string if no file, or a list of content blocks
    if images/documents are attached (for vision-capable models).
    """
    if not file_path or not os.path.exists(file_path):
        return message

    filename = os.path.basename(file_path)
    ext = os.path.splitext(filename)[1].lower()

    # Detect MIME type
    mime_map = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".csv": "text/csv", ".txt": "text/plain", ".md": "text/markdown",
        ".json": "application/json", ".xml": "application/xml",
        ".html": "text/html",
    }
    mime = mime_map.get(ext, "application/octet-stream")

    # For images, verify actual content type from file magic bytes.
    # File extensions can lie (e.g. .png file containing JPEG data).
    if mime in _IMAGE_TYPES or ext in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
        try:
            with open(file_path, "rb") as f:
                header = f.read(12)
            if header[:3] == b'\xff\xd8\xff':
                mime = "image/jpeg"
            elif header[:8] == b'\x89PNG\r\n\x1a\n':
                mime = "image/png"
            elif header[:4] == b'GIF8':
                mime = "image/gif"
            elif header[:4] == b'RIFF' and header[8:12] == b'WEBP':
                mime = "image/webp"
        except Exception:
            pass

    content_blocks: list[dict] = []

    # Add text message first
    if message:
        content_blocks.append({"type": "text", "text": message})

    if mime in _IMAGE_TYPES:
        # Vision: send as base64 image
        with open(file_path, "rb") as f:
            img_data = base64.standard_b64encode(f.read()).decode()
        content_blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": mime,
                "data": img_data,
            },
        })
    elif mime == "application/pdf":
        # PDF: try to extract text, fallback to document block
        try:
            with open(file_path, "rb") as f:
                pdf_data = base64.standard_b64encode(f.read()).decode()
            content_blocks.append({
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": pdf_data,
                },
            })
        except Exception as e:
            content_blocks.append({
                "type": "text",
                "text": f"[PDF upload: {filename} — could not process: {e}]",
            })
    elif mime in _TEXT_TYPES:
        # Text-like: inline the content
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                text_content = f.read()
            # Truncate very large files
            if len(text_content) > 100_000:
                text_content = text_content[:100_000] + "\n\n[... truncated at 100K characters ...]"
            content_blocks.append({
                "type": "text",
                "text": f"--- Uploaded file: {filename} ---\n{text_content}\n--- End of {filename} ---",
            })
        except Exception as e:
            content_blocks.append({
                "type": "text",
                "text": f"[File upload: {filename} — read error: {e}]",
            })
    else:
        # Binary file: just note it
        file_size = os.path.getsize(file_path)
        content_blocks.append({
            "type": "text",
            "text": f"[File uploaded: {filename} ({file_size} bytes, type: {mime}). Saved at: {file_path}]",
        })

    if not content_blocks:
        return message

    # If only text blocks, flatten
    if len(content_blocks) == 1 and content_blocks[0]["type"] == "text":
        return content_blocks[0]["text"]

    return content_blocks


# --- Endpoints ---

@router.post("/api/chat/conversation")
async def create_conversation():
    """Create a new conversation — matches CX Agent API."""
    conversation_id = str(uuid.uuid4())
    _conversations[conversation_id] = {
        "id": conversation_id,
        "history": [],
        "files": [],
    }
    logger.info("Created launchpad conversation: %s", conversation_id)
    return {"conversation_id": conversation_id}


@router.post("/api/chat/message")
async def send_message(
    conversation_id: str = Form(...),
    message: str = Form(""),
    file: list[UploadFile] = File(default=[]),
):
    """Send a message with optional file upload(s) — matches CX Agent API.

    Accepts multipart/form-data with:
    - conversation_id (required)
    - message (text content)
    - file (optional upload(s) — images, PDFs, CSVs, etc.; can repeat for multiple files)
    """
    engine = _get_engine()

    # Initialize conversation if needed
    if conversation_id not in _conversations:
        _conversations[conversation_id] = {"id": conversation_id, "history": [], "files": []}

    conv = _conversations[conversation_id]
    conv.setdefault("files", [])  # Ensure files key exists for older conversations

    # Handle file upload(s)
    file_paths = []
    for upload in file:
        if not upload or not upload.filename:
            continue
        file_id = str(uuid.uuid4())
        temp_dir = tempfile.gettempdir()
        safe_name = upload.filename.replace("/", "_").replace("\\", "_")
        fpath = os.path.join(temp_dir, f"{file_id}_{safe_name}")

        content = await upload.read()
        if len(content) > 0:
            with open(fpath, "wb") as f:
                f.write(content)
            _uploaded_files[file_id] = fpath
            # Track file in conversation state so shortcuts can reference it
            conv["files"].append({
                "id": file_id,
                "name": upload.filename,
                "path": fpath,
                "size": len(content),
            })
            file_paths.append(fpath)
            logger.info(
                "File uploaded: %s (%d bytes, type: %s)",
                upload.filename, len(content), upload.content_type
            )
        else:
            logger.warning("Zero-byte file upload: %s", upload.filename)

    file_path = file_paths[0] if file_paths else None

    # Build multimodal content
    user_content = _build_multimodal_content(message, file_path)

    # Run through the NXT Agency engine
    agent_slug = _get_agent_slug()
    try:
        result = await engine.run(
            agent_slug=agent_slug,
            session_id=conversation_id,
            user_message=user_content,
            history=conv["history"],
        )

        response_text = result.get("response", "")

        # Update conversation history
        # Store user message as string for history (not multimodal blocks)
        conv["history"].append({"role": "user", "content": message or "[file upload]"})
        conv["history"].append({"role": "assistant", "content": response_text})

        # Trim history to prevent context overflow (keep last 40 messages)
        if len(conv["history"]) > 40:
            conv["history"] = conv["history"][-40:]

        return {
            "reply": response_text,
            "response": response_text,  # Both keys for compatibility
            "model": result.get("model", ""),
            "turns": result.get("turns", 1),
            "tool_calls": result.get("tool_calls", []),
        }

    except Exception as e:
        logger.exception("Error processing launchpad message: %s", e)
        return {
            "reply": f"I encountered an error processing your request: {str(e)}",
            "response": f"I encountered an error processing your request: {str(e)}",
            "error": str(e),
        }


@router.websocket("/ws/{conversation_id}")
async def websocket_chat(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time streaming chat with live screenshot support.

    Supports message types:
    - {"type": "message", "content": "..."} — text message
    - {"type": "file", "content": "...", "file": {"data": "base64...", "name": "..."}} — file upload
    - {"type": "ping"} — keepalive

    Streams events back to the client:
    - tool_start — a tool is about to execute
    - screenshot — base64 PNG from computer-use browser screenshots
    - tool_result — non-image tool result summary
    - tool_error — tool execution error
    - text_delta — partial assistant text (for real-time display)
    - status — thinking / progress messages
    - message_complete — final marker with turns and tools used
    - error — unrecoverable error
    """
    await websocket.accept()
    engine = _get_engine()
    agent_slug = _get_agent_slug()

    if conversation_id not in _conversations:
        _conversations[conversation_id] = {"id": conversation_id, "history": [], "files": []}
    conv = _conversations[conversation_id]
    conv.setdefault("files", [])  # Ensure files key exists for conversations created via REST

    # Track active WebSocket so background monitors can deliver results
    conv["_active_ws"] = websocket

    # Deliver any pending journey map result from a previous WS session
    await _deliver_pending_journey(websocket, conv)

    # Welcome
    await websocket.send_json({
        "type": "message",
        "content": (
            "I'm the NXT Intelligence Agent. Tell me what you need and I'll handle it.\n\n"
            "I can operate all Intelligence Augmentation apps:\n"
            "-- Journey Mapper -- turn transcripts into journey maps\n"
            "-- Social Data Collector -- collect Reddit, TrustPilot, Play Store data\n"
            "-- Video Transcriber -- transcribe YouTube or uploaded videos\n"
            "-- Social Research -- sentiment analysis and topic modeling\n"
            "-- Character Generator -- create characters, scenes, and videos\n"
            "-- Copilot Recipe Builder -- build Copilot Studio agent recipes\n"
            "-- Miro Board Generator -- convert journey maps to Miro boards\n\n"
            "Just tell me what you need and I'll ask for the details."
        ),
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")
            if msg_type != "ping":
                logger.info("WS %s: received %s message", conversation_id, msg_type)

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                # Check for pending background results on each ping
                await _deliver_pending_journey(websocket, conv)
                continue

            # Build user_content from message or file
            user_message = ""
            user_content = ""
            file_path = None

            if msg_type == "message":
                user_message = data.get("content", "")
                user_content = user_message
            elif msg_type == "file":
                user_message = data.get("content", "")
                file_info = data.get("file", {})
                file_data_b64 = file_info.get("data", "")
                file_name = file_info.get("name", "unnamed_file")
                if file_data_b64:
                    try:
                        file_data = base64.b64decode(file_data_b64)
                        file_id = str(uuid.uuid4())
                        file_path = os.path.join(tempfile.gettempdir(), f"{file_id}_{file_name}")
                        with open(file_path, "wb") as f:
                            f.write(file_data)
                        _uploaded_files[file_id] = file_path
                        # Track file in conversation state so later turns can reference it
                        conv["files"].append({
                            "id": file_id,
                            "name": file_name,
                            "path": file_path,
                            "size": len(file_data),
                        })
                        logger.info("WS file upload: %s (%d bytes)", file_name, len(file_data))
                    except Exception as e:
                        logger.error("WS file decode error: %s", e)
                        await websocket.send_json({"type": "error", "content": f"File error: {e}"})
                        continue
                # If the file message has no meaningful text content, just store
                # the file and wait for the next message. The user will send a
                # text message with instructions after uploading files.
                if not user_message or user_message.startswith("Uploading file:"):
                    await websocket.send_json({
                        "type": "status",
                        "message": f"File received: {file_name}",
                    })
                    continue

                user_content = _build_multimodal_content(
                    user_message, file_path
                )
            else:
                continue

            # If this is a text-only message but the conversation has uploaded files,
            # remind the agent about the available files so it doesn't ask again.
            if msg_type == "message" and conv["files"] and isinstance(user_content, str):
                file_list = ", ".join(
                    f"{f['name']} (saved at {f['path']})" for f in conv["files"]
                )
                user_content = (
                    f"{user_content}\n\n"
                    f"[System: The user has previously uploaded these files in this conversation: "
                    f"{file_list}. You can read these files using the bash tool or pass their "
                    f"content to other tools. Do NOT ask the user to re-upload them.]"
                )

            # -----------------------------------------------------------
            # P0 Innovation #6: Handle pending confirmation from previous
            # AI parameter extraction. If user says "yes", execute with
            # confirmed params. If correction, re-extract and re-confirm.
            # -----------------------------------------------------------
            _msg_lower = (user_message or "").lower()
            if conv.get("_pending_confirmation"):
                _handled = await _handle_pending_confirmation(websocket, conv, user_message or "")
                if _handled:
                    conv["history"].append({"role": "user", "content": user_message})
                    continue
                # If not handled, _confirmed_execution is set — fall through
                # to the shortcut logic which will pick it up.

            # -----------------------------------------------------------
            # Resume pending character generation if user was asked for name
            # -----------------------------------------------------------
            _pending_char = conv.pop("_pending_character", None)
            if _pending_char and user_message and not any(
                kw in _msg_lower for kw in ["cancel", "never mind", "stop", "no"]
            ):
                # User's reply IS the character name
                _char_name = user_message.strip().strip("\"'")
                _char_desc = _pending_char.get("description", "")
                _ref_image = ""
                if conv["files"]:
                    for f in conv["files"]:
                        ext = os.path.splitext(f["name"])[1].lower()
                        if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                            _ref_image = f["path"]
                            break

                try:
                    from app.tools.cx_services import GenerateCharacterComputerTool
                    from app.tools.base import AgentContext

                    await websocket.send_json({
                        "type": "status",
                        "message": f"Generating character '{_char_name}'...",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "computer",
                        "description": "Opening Character Generator",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "generate_character_browser",
                        "description": "Generating character",
                    })

                    tool = GenerateCharacterComputerTool()
                    ctx = AgentContext(
                        session_id=conversation_id, agent_slug=agent_slug,
                    )
                    result = await tool.execute({
                        "description": _char_desc or _char_name,
                        "character_name": _char_name,
                        "reference_image_path": _ref_image,
                    }, ctx)

                    # Send screenshot
                    ss = result.get("screenshot")
                    if ss and isinstance(ss, dict) and ss.get("type") == "image":
                        source = ss.get("source", {})
                        if source.get("type") == "base64":
                            await websocket.send_json({
                                "type": "screenshot",
                                "tool": "generate_character_browser",
                                "image": source.get("data", ""),
                                "url": "http://consistent-character-generator:5010",
                            })

                    msg = result.get("message", str(result.get("error", "Unknown result")))
                    await websocket.send_json({"type": "text_delta", "content": msg})
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "generate_character_browser",
                        "summary": msg[:300],
                    })
                    await websocket.send_json({
                        "type": "message_complete",
                        "turns": 1,
                        "tools_used": ["generate_character_browser"],
                    })

                    # Send character images via HTTP
                    exported = result.get("exported_characters", [])
                    for ef in exported:
                        fpath = ef.get("path", "")
                        if fpath and os.path.exists(fpath):
                            img_id = str(uuid.uuid4())
                            _generated_images[img_id] = fpath
                            name = ef.get("name", "Character")
                            img_url = f"/api/chat/image/{img_id}"
                            try:
                                await websocket.send_json({
                                    "type": "inline_image",
                                    "url": img_url,
                                    "alt": name,
                                })
                            except Exception:
                                pass

                    conv["history"].append({"role": "user", "content": user_message})
                    conv["history"].append({"role": "assistant", "content": msg})
                    continue

                except Exception as e:
                    logger.exception("Pending character generation failed: %s", e)

            # -----------------------------------------------------------
            # Deterministic shortcut: if the user clearly wants a journey
            # map and we have a file, skip the agent and call the tool
            # directly. No LLM decision-making, no wasted turns.
            # -----------------------------------------------------------
            _journey_keywords = ["journey map", "journey mapping", "customer journey", "experience map"]
            _wants_journey = any(kw in _msg_lower for kw in _journey_keywords)

            # Filter to document files only (not images from character gen, etc.)
            _JOURNEY_EXTS = {".pdf", ".csv", ".txt", ".json", ".md", ".xml", ".html"}
            _journey_files = [
                f for f in conv.get("files", [])
                if os.path.splitext(f["name"])[1].lower() in _JOURNEY_EXTS
            ]

            if _wants_journey and _journey_files:
                try:
                    from app.tools.cx_services import GenerateJourneyMapTool
                    from app.tools.base import AgentContext

                    await websocket.send_json({"type": "status", "message": "Starting journey map generation..."})
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "computer",
                        "description": "Opening Journey Mapper app",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "generate_journey_map",
                        "description": "Generating journey map",
                    })

                    tool = GenerateJourneyMapTool()
                    ctx = AgentContext(session_id=conversation_id, agent_slug=agent_slug)

                    # Build title from the first DOCUMENT file (not images)
                    # Strip UUID prefix BEFORE replacing separators with spaces
                    _fname_raw = _journey_files[0]["name"]
                    # Strip UUID prefix (with hyphens intact) e.g. "27D43C8B-3D07-45E7-94D6-5E2D26F96137_"
                    _fname_raw = re.sub(r'^[a-fA-F0-9\-]{32,36}_?', '', _fname_raw)
                    # Now replace separators with spaces
                    _fname_clean = _fname_raw.replace("_", " ").replace("-", " ")
                    _fname_clean = os.path.splitext(_fname_clean)[0].strip()
                    _fname_clean = re.sub(r'\s+', ' ', _fname_clean)  # collapse whitespace

                    # Let the user's message override the title if it contains
                    # a clear name (e.g. "create a journey map called X")
                    _title_from_msg = ""
                    _name_match = re.search(
                        r'(?:called|named|titled|for)\s+["\']?(.+?)["\']?\s*$',
                        user_message or "", re.IGNORECASE
                    )
                    if _name_match:
                        _title_from_msg = _name_match.group(1).strip()

                    if _title_from_msg and len(_title_from_msg) > 3:
                        _title = _title_from_msg.title()
                    elif len(_fname_clean) > 5:
                        _title = _fname_clean.title()
                    else:
                        _title = "Customer Journey Map"

                    # Only pass document files, not images
                    _file_paths = [f["path"] for f in _journey_files if os.path.exists(f["path"])]

                    result = await tool.execute({
                        "title": _title,
                        "description": user_message,
                        "file_paths": _file_paths,
                        "file_path": _file_paths[0] if _file_paths else "",
                    }, ctx)

                    # Send screenshot if available
                    ss = result.get("screenshot")
                    if ss and isinstance(ss, dict) and ss.get("type") == "image":
                        source = ss.get("source", {})
                        if source.get("type") == "base64":
                            await websocket.send_json({
                                "type": "screenshot",
                                "tool": "generate_journey_map",
                                "image": source.get("data", ""),
                                # Show the USER-facing service URL, not the internal
                                # Docker hostname (journey-mapper:8000) the agent's
                                # browser actually navigates to. The internal host
                                # is unreachable from the user's browser.
                                "url": os.environ.get(
                                    "JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"
                                ),
                            })

                    # Send result
                    status = result.get("status", "")
                    msg = result.get("message", str(result.get("error", "Unknown result")))
                    await websocket.send_json({"type": "text_delta", "content": msg})

                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "generate_journey_map",
                        "summary": msg[:300],
                    })

                    await websocket.send_json({
                        "type": "message_complete",
                        "turns": 1,
                        "tools_used": ["generate_journey_map"],
                    })

                    conv["history"].append({"role": "user", "content": user_message})
                    conv["history"].append({"role": "assistant", "content": msg})

                    # Background monitor: poll the browser page URL until the
                    # journey map result page appears, then notify the user.
                    # Stores result in conv["_pending_journey"] so it survives
                    # WebSocket reconnects (the WS may drop during the 15-25 min wait).
                    if result.get("status") == "submitted":
                        import asyncio as _aio

                        async def _monitor_journey_completion(conv_id, conv_ref):
                            """Poll browser URL for journey map completion (up to 30 min)."""
                            try:
                                import app.tools.computer_use as _cu
                                client_url_base = os.environ.get(
                                    "JOURNEY_MAPPER_CLIENT_URL", "http://localhost:8080"
                                )
                                for i in range(360):  # 30 minutes at 5s intervals
                                    await _aio.sleep(5)
                                    if _cu._page and not _cu._page.is_closed():
                                        current = _cu._page.url
                                        if "/journey_maps/" in current:
                                            # Extract the dynamic path
                                            path = current.split("journey-mapper:8000")[-1]
                                            user_url = f"{client_url_base}{path}"
                                            logger.info("Journey map ready: %s", user_url)

                                            # Build pending result with optional screenshot
                                            pending = {"url": user_url, "screenshot": None}
                                            try:
                                                import base64 as _b64
                                                img = await _cu._page.screenshot(type="png", timeout=10000)
                                                pending["screenshot"] = _b64.standard_b64encode(img).decode()
                                            except Exception:
                                                pass

                                            # Store in conv so any active/future WS can deliver it
                                            conv_ref["_pending_journey"] = pending
                                            conv_ref["history"].append({
                                                "role": "assistant",
                                                "content": f"Journey map ready: {user_url}",
                                            })

                                            # Try to deliver immediately via the current WS
                                            active_ws = conv_ref.get("_active_ws")
                                            if active_ws:
                                                try:
                                                    await _deliver_pending_journey(active_ws, conv_ref)
                                                except Exception:
                                                    pass  # Will be delivered on next WS message
                                            return
                                    else:
                                        return  # Page closed, stop monitoring
                            except Exception as e:
                                logger.warning("Journey monitor error: %s", e)

                        _aio.create_task(_monitor_journey_completion(conversation_id, conv))

                    continue  # Skip the normal agent loop

                except Exception as e:
                    logger.exception("Deterministic journey map shortcut failed: %s", e)
                    # Notify the user about the error instead of silently falling through
                    try:
                        await websocket.send_json({
                            "type": "text_delta",
                            "content": (
                                f"Journey map shortcut encountered an error: {str(e)[:200]}. "
                                f"Retrying via the normal agent path..."
                            ),
                        })
                    except Exception:
                        pass
                    # Fall through to normal agent execution

            # -----------------------------------------------------------
            # Deterministic shortcut: Reddit data collection.
            # P0 Innovation: AI extraction + confirmation replaces regex.
            # -----------------------------------------------------------
            _reddit_keywords = [
                "reddit", "subreddit", "r/", "collect posts", "fetch posts",
                "get posts", "get me posts", "scrape reddit", "reddit data",
                "collect data from r/", "pull posts",
            ]
            _wants_reddit = any(kw in _msg_lower for kw in _reddit_keywords)

            # Check if this is a confirmed execution from the confirmation flow
            _confirmed = conv.pop("_confirmed_execution", None)
            if _confirmed and _confirmed.get("tool") == "reddit":
                _wants_reddit = True

            if _wants_reddit:
                try:
                    from app.tools.cx_services import CollectRedditDataTool
                    from app.tools.base import AgentContext

                    # --- P0: AI Parameter Extraction (replaces all regex) ---
                    if _confirmed:
                        # User already confirmed — use confirmed params
                        _params = _confirmed["params_with_defaults"]
                    else:
                        # First pass: extract params with AI
                        await websocket.send_json({
                            "type": "status",
                            "message": "Analyzing your request...",
                        })
                        _raw_params = await _ai_extract_params(user_message or "", "reddit")

                        _subreddit = _raw_params.get("subreddit")
                        if not _subreddit:
                            # Can't determine subreddit — fall through to normal agent
                            pass
                        else:
                            # Validate extracted params
                            _issues = _validate_params(_raw_params, "reddit")
                            if _issues:
                                await websocket.send_json({
                                    "type": "text_delta",
                                    "content": f"I found some issues: {', '.join(_issues)}. Can you clarify?",
                                })
                                await websocket.send_json({"type": "message_complete", "turns": 1, "tools_used": []})
                                conv["history"].append({"role": "user", "content": user_message})
                                conv["history"].append({"role": "assistant", "content": f"Parameter issues: {_issues}"})
                                continue

                            # Apply defaults for unmentioned params
                            _params_with_defaults = _apply_defaults(_raw_params, "reddit")

                            # --- P0: Pre-Execution Confirmation Card ---
                            conv["_pending_confirmation"] = {
                                "tool": "reddit",
                                "display_name": "Reddit Data Collector",
                                "params": _raw_params,
                                "params_with_defaults": _params_with_defaults,
                                "original_message": user_message,
                            }
                            await _send_confirmation_card(
                                websocket, "reddit", "Reddit Data Collector",
                                _raw_params, TOOL_SCHEMAS["reddit"],
                            )
                            conv["history"].append({"role": "user", "content": user_message})
                            conv["history"].append({"role": "assistant", "content": "(Confirmation card sent)"})
                            continue  # Wait for user to confirm

                    # --- Confirmed execution path ---
                    _subreddit = _params.get("subreddit", "")
                    _count = int(_params.get("count", 25))
                    _time_filter = _params.get("time_filter", "week")
                    _comments = int(_params.get("comments_per_post", 5))

                    await websocket.send_json({
                        "type": "status",
                        "message": f"Collecting {_count} posts from r/{_subreddit} ({_time_filter})...",
                    })
                    # Open the live browser panel
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "computer",
                        "description": "Opening Social Data Collector",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "collect_reddit_data",
                        "description": f"Collecting r/{_subreddit} data",
                    })

                    tool = CollectRedditDataTool()
                    ctx = AgentContext(
                        session_id=conversation_id, agent_slug=agent_slug,
                    )
                    result = await tool.execute({
                        "subreddit": _subreddit,
                        "count": _count,
                        "time_filter": _time_filter,
                        "comments_per_post": _comments,
                    }, ctx)

                    # Send screenshot if available
                    ss = result.get("screenshot")
                    if ss and isinstance(ss, dict) and ss.get("type") == "image":
                        source = ss.get("source", {})
                        if source.get("type") == "base64":
                            await websocket.send_json({
                                "type": "screenshot",
                                "tool": "collect_reddit_data",
                                "image": source.get("data", ""),
                                "url": "http://reddit-ripper:5000",
                            })

                    # Send result text
                    _client_url = os.environ.get(
                        "REDDIT_RIPPER_CLIENT_URL", "http://localhost:5001"
                    )
                    msg = result.get("message", str(result.get("error", "Unknown result")))
                    _job_id = result.get("job_id")

                    await websocket.send_json({"type": "text_delta", "content": msg})

                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "collect_reddit_data",
                        "summary": msg[:300],
                    })

                    await websocket.send_json({
                        "type": "message_complete",
                        "turns": 1,
                        "tools_used": ["collect_reddit_data"],
                    })

                    conv["history"].append({"role": "user", "content": user_message})
                    conv["history"].append({"role": "assistant", "content": msg})

                    # Background monitor: poll the Reddit Ripper job status
                    # until collection completes, then send download links.
                    if result.get("status") == "collecting":

                        async def _monitor_reddit_collection(
                            ws, conv_ref, job_id, client_url, subreddit,
                        ):
                            """Poll Reddit Ripper job until complete (up to 15 min)."""
                            try:
                                import app.tools.computer_use as _cu
                                import base64 as _b64

                                # If no job_id, try to discover it from the page JS
                                if not job_id and _cu._page and not _cu._page.is_closed():
                                    for _retry in range(15):
                                        try:
                                            job_id = await _cu._page.evaluate(
                                                '() => window.currentJobId || null'
                                            )
                                            if job_id:
                                                logger.info("Discovered job_id from page: %s", job_id)
                                                break
                                        except Exception:
                                            pass
                                        await asyncio.sleep(2)

                                if not job_id:
                                    logger.warning("Could not discover job_id, monitor exiting")
                                    return

                                for i in range(180):  # 15 min at 5s intervals
                                    await asyncio.sleep(5)

                                    # Poll the API for job status
                                    try:
                                        async with httpx.AsyncClient(timeout=10) as hc:
                                            sr = await hc.get(
                                                f"http://reddit-ripper:5000/api/status/{job_id}"
                                            )
                                            if sr.status_code != 200:
                                                continue
                                            status_data = sr.json()
                                    except Exception:
                                        continue

                                    progress = status_data.get("progress", 0)
                                    status = status_data.get("status", "")

                                    # Send periodic progress screenshots
                                    if i % 6 == 5 and _cu._page and not _cu._page.is_closed():
                                        try:
                                            img = await _cu._page.screenshot(
                                                type="png", timeout=10000,
                                            )
                                            await ws.send_json({
                                                "type": "screenshot",
                                                "tool": "collect_reddit_data",
                                                "image": _b64.standard_b64encode(img).decode(),
                                                "url": client_url,
                                            })
                                        except Exception:
                                            pass

                                    if status == "completed":
                                        files = status_data.get("files", [])

                                        # Take final screenshot
                                        if _cu._page and not _cu._page.is_closed():
                                            try:
                                                img = await _cu._page.screenshot(
                                                    type="png", timeout=10000,
                                                )
                                                await ws.send_json({
                                                    "type": "screenshot",
                                                    "tool": "collect_reddit_data",
                                                    "image": _b64.standard_b64encode(img).decode(),
                                                    "url": client_url,
                                                })
                                            except Exception:
                                                pass

                                        # Build download links
                                        links = []
                                        for fname in files:
                                            dl_url = f"{client_url}/api/download/{job_id}/{fname}"
                                            links.append(f"- [{fname}]({dl_url})")
                                        links_text = "\n".join(links) if links else "No files generated."

                                        completion_msg = (
                                            f"\n\nReddit data collection for r/{subreddit} is complete!\n\n"
                                            f"**Download your data:**\n{links_text}\n\n"
                                            f"You can also view results at: {client_url}"
                                        )

                                        await ws.send_json({
                                            "type": "text_delta",
                                            "content": completion_msg,
                                        })
                                        await ws.send_json({
                                            "type": "message_complete",
                                            "turns": 0,
                                            "tools_used": [],
                                        })
                                        conv_ref["history"].append({
                                            "role": "assistant",
                                            "content": completion_msg,
                                        })
                                        return

                                    elif status == "error":
                                        err = status_data.get("error", "Unknown error")
                                        await ws.send_json({
                                            "type": "text_delta",
                                            "content": f"\n\nReddit collection failed: {err}",
                                        })
                                        await ws.send_json({
                                            "type": "message_complete",
                                            "turns": 0,
                                            "tools_used": [],
                                        })
                                        return

                            except Exception as e:
                                logger.warning("Reddit monitor error: %s", e)

                        asyncio.create_task(
                            _monitor_reddit_collection(
                                websocket, conv, _job_id, _client_url, _subreddit,
                            )
                        )

                    continue  # Skip the normal agent loop

                except Exception as e:
                    logger.exception("Deterministic Reddit collection shortcut failed: %s", e)
                    # Fall through to normal agent execution

            # -----------------------------------------------------------
            # Deterministic shortcut: Video Transcription.
            # Detect YouTube URLs or "transcribe" requests.
            # -----------------------------------------------------------
            _transcribe_keywords = [
                "transcribe", "transcript", "video to text", "speech to text",
                "transcription", "get transcript",
            ]
            _youtube_pattern = r'(https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[\w\-&=]+)'
            _wants_transcribe = any(kw in _msg_lower for kw in _transcribe_keywords)
            # Also trigger on bare YouTube URLs
            _yt_match = re.search(_youtube_pattern, user_message or "")
            if _yt_match and not _wants_journey:
                _wants_transcribe = True

            if _wants_transcribe:
                try:
                    from app.tools.cx_services import TranscribeVideoComputerTool
                    from app.tools.base import AgentContext

                    _youtube_url = _yt_match.group(1) if _yt_match else ""
                    _video_file = ""
                    # Check for uploaded video files
                    if not _youtube_url and conv["files"]:
                        for f in conv["files"]:
                            ext = os.path.splitext(f["name"])[1].lower()
                            if ext in (".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav", ".m4a"):
                                _video_file = f["path"]
                                break

                    if not _youtube_url and not _video_file:
                        pass  # Fall through to normal agent
                    else:
                        await websocket.send_json({
                            "type": "status",
                            "message": "Starting video transcription...",
                        })
                        await websocket.send_json({
                            "type": "tool_start",
                            "tool": "computer",
                            "description": "Opening Video Transcriber",
                        })
                        await websocket.send_json({
                            "type": "tool_start",
                            "tool": "transcribe_video_browser",
                            "description": "Transcribing video",
                        })

                        tool = TranscribeVideoComputerTool()
                        ctx = AgentContext(
                            session_id=conversation_id, agent_slug=agent_slug,
                        )
                        result = await tool.execute({
                            "youtube_url": _youtube_url,
                            "file_path": _video_file,
                        }, ctx)

                        # Send screenshot
                        ss = result.get("screenshot")
                        if ss and isinstance(ss, dict) and ss.get("type") == "image":
                            source = ss.get("source", {})
                            if source.get("type") == "base64":
                                await websocket.send_json({
                                    "type": "screenshot",
                                    "tool": "transcribe_video_browser",
                                    "image": source.get("data", ""),
                                    "url": "http://video-analyzer:5000",
                                })

                        msg = result.get("message", str(result.get("error", "Unknown result")))
                        _job_id = result.get("job_id")
                        _client_url = os.environ.get(
                            "VIDEO_ANALYZER_CLIENT_URL", "http://localhost:5002"
                        )

                        await websocket.send_json({"type": "text_delta", "content": msg})
                        await websocket.send_json({
                            "type": "tool_result",
                            "tool": "transcribe_video_browser",
                            "summary": msg[:300],
                        })
                        await websocket.send_json({
                            "type": "message_complete",
                            "turns": 1,
                            "tools_used": ["transcribe_video_browser"],
                        })
                        conv["history"].append({"role": "user", "content": user_message})
                        conv["history"].append({"role": "assistant", "content": msg})

                        # Background monitor for transcription completion
                        if result.get("status") == "transcribing":
                            import asyncio as _aio

                            async def _monitor_transcription(
                                ws, conv_ref, job_id, client_url, input_desc,
                            ):
                                try:
                                    import app.tools.computer_use as _cu
                                    import base64 as _b64

                                    # Discover job_id if not available
                                    if not job_id and _cu._page and not _cu._page.is_closed():
                                        for _retry in range(15):
                                            try:
                                                job_id = await _cu._page.evaluate(
                                                    '() => window.currentJobId || null'
                                                )
                                                if job_id:
                                                    break
                                            except Exception:
                                                pass
                                            await _aio.sleep(2)
                                    if not job_id:
                                        return

                                    for i in range(180):  # 15 min
                                        await _aio.sleep(5)
                                        try:
                                            async with httpx.AsyncClient(timeout=10) as hc:
                                                sr = await hc.get(
                                                    f"http://video-analyzer:5000/jobs/{job_id}"
                                                )
                                                if sr.status_code != 200:
                                                    continue
                                                status_data = sr.json()
                                        except Exception:
                                            continue

                                        status = status_data.get("status", "")

                                        # Periodic screenshots
                                        if i % 6 == 5 and _cu._page and not _cu._page.is_closed():
                                            try:
                                                img = await _cu._page.screenshot(type="png", timeout=10000)
                                                await ws.send_json({
                                                    "type": "screenshot",
                                                    "tool": "transcribe_video_browser",
                                                    "image": _b64.standard_b64encode(img).decode(),
                                                    "url": client_url,
                                                })
                                            except Exception:
                                                pass

                                        if status == "completed":
                                            # Fetch transcript
                                            transcript = ""
                                            try:
                                                async with httpx.AsyncClient(timeout=30) as hc:
                                                    tr = await hc.get(
                                                        f"http://video-analyzer:5000/transcript/{job_id}"
                                                    )
                                                    if tr.status_code == 200:
                                                        t_data = tr.json()
                                                        transcript = t_data.get("transcript", "")
                                            except Exception:
                                                pass

                                            # Send screenshot
                                            if _cu._page and not _cu._page.is_closed():
                                                try:
                                                    img = await _cu._page.screenshot(type="png", timeout=10000)
                                                    await ws.send_json({
                                                        "type": "screenshot",
                                                        "tool": "transcribe_video_browser",
                                                        "image": _b64.standard_b64encode(img).decode(),
                                                        "url": client_url,
                                                    })
                                                except Exception:
                                                    pass

                                            preview = transcript[:2000] if transcript else "Transcript available."
                                            completion_msg = (
                                                f"\n\nTranscription complete for {input_desc}!\n\n"
                                                f"**Transcript preview:**\n{preview}\n\n"
                                                f"View full transcript at: {client_url}"
                                            )
                                            await ws.send_json({
                                                "type": "text_delta",
                                                "content": completion_msg,
                                            })
                                            await ws.send_json({
                                                "type": "message_complete",
                                                "turns": 0,
                                                "tools_used": [],
                                            })
                                            conv_ref["history"].append({
                                                "role": "assistant",
                                                "content": completion_msg,
                                            })
                                            return

                                        elif status == "failed":
                                            err = status_data.get("error", "Unknown error")
                                            await ws.send_json({
                                                "type": "text_delta",
                                                "content": f"\n\nTranscription failed: {err}",
                                            })
                                            await ws.send_json({
                                                "type": "message_complete",
                                                "turns": 0,
                                                "tools_used": [],
                                            })
                                            return

                                except Exception as e:
                                    logger.warning("Transcription monitor error: %s", e)

                            _input_desc = _youtube_url or os.path.basename(_video_file)
                            _aio.create_task(
                                _monitor_transcription(
                                    websocket, conv, _job_id, _client_url, _input_desc,
                                )
                            )

                        continue

                except Exception as e:
                    logger.exception("Deterministic transcription shortcut failed: %s", e)

            # -----------------------------------------------------------
            # Deterministic shortcut: Copilot Studio Recipe Builder.
            # -----------------------------------------------------------
            # NOTE: Copilot Recipe shortcut DISABLED. The generic agent produces
            # better recipes via full computer-use interaction with the React UI
            # (template selection, form filling, SSE streaming with visual feedback).
            # The direct API shortcut was generating inferior output.
            # When the agent finishes, recipes are saved to /tmp/ and can be
            # accessed via the Recipe Generator app at localhost:5013.
            _wants_copilot = False

            if _wants_copilot:
                try:
                    from app.tools.cx_services import BuildCopilotRecipeTool
                    from app.tools.base import AgentContext

                    await websocket.send_json({
                        "type": "status",
                        "message": "Building Copilot Studio recipe...",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "computer",
                        "description": "Opening Copilot Recipe Builder",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "build_copilot_recipe",
                        "description": "Generating Copilot Studio recipe",
                    })

                    # CONSTRAINT 1: Read uploaded file content to include in the recipe.
                    # The user may have attached a PDF/doc with knowledge to bake in.
                    _file_content = ""
                    for f in conv.get("files", []):
                        fpath = f.get("path", "")
                        if fpath and os.path.exists(fpath):
                            try:
                                ext = os.path.splitext(f["name"])[1].lower()
                                if ext == ".pdf":
                                    # Extract text from PDF
                                    import subprocess
                                    result_pdf = subprocess.run(
                                        ["python3", "-c",
                                         f"import fitz; doc=fitz.open('{fpath}'); print(''.join(p.get_text() for p in doc))"],
                                        capture_output=True, text=True, timeout=10,
                                    )
                                    if result_pdf.returncode == 0 and result_pdf.stdout.strip():
                                        _file_content += f"\n--- Content from {f['name']} ---\n{result_pdf.stdout[:50000]}\n"
                                    else:
                                        # Fallback: read as binary text
                                        with open(fpath, "r", encoding="utf-8", errors="replace") as pf:
                                            _file_content += f"\n--- Content from {f['name']} ---\n{pf.read()[:50000]}\n"
                                else:
                                    with open(fpath, "r", encoding="utf-8", errors="replace") as tf:
                                        _file_content += f"\n--- Content from {f['name']} ---\n{tf.read()[:50000]}\n"
                            except Exception as file_err:
                                logger.warning("Could not read file %s: %s", f["name"], file_err)

                    # Build enriched description with file content
                    _enriched_description = user_message or ""
                    if _file_content:
                        _enriched_description += f"\n\nATTACHED KNOWLEDGE (use this content to build the recipe):\n{_file_content}"

                    _client_url = os.environ.get(
                        "COPILOT_RECIPE_GENERATOR_CLIENT_URL", "http://localhost:5013"
                    )

                    # Send immediate acknowledgment (non-blocking pattern)
                    _file_note = f" I'll incorporate content from your uploaded file(s)." if _file_content else ""
                    _ack_msg = (
                        f"Generating your Copilot Studio recipe now. This takes 30-60 seconds.{_file_note}\n\n"
                        f"I'll deliver the full recipe with a download link when it's ready."
                    )
                    await websocket.send_json({"type": "text_delta", "content": _ack_msg})
                    await websocket.send_json({
                        "type": "message_complete",
                        "turns": 1,
                        "tools_used": ["build_copilot_recipe"],
                    })
                    conv["history"].append({"role": "user", "content": user_message})
                    conv["history"].append({"role": "assistant", "content": _ack_msg})

                    # Background task: generate recipe, then deliver with download
                    async def _generate_recipe_background(
                        ws, conv_ref, description, client_url,
                    ):
                        try:
                            tool = BuildCopilotRecipeTool()
                            ctx = AgentContext(
                                session_id=conversation_id, agent_slug=agent_slug,
                            )
                            result = await tool.execute({
                                "description": description,
                            }, ctx)

                            # Send screenshot of the recipe generator app
                            ss = result.get("screenshot")
                            if ss and isinstance(ss, dict) and ss.get("type") == "image":
                                source = ss.get("source", {})
                                if source.get("type") == "base64":
                                    try:
                                        await ws.send_json({
                                            "type": "screenshot",
                                            "tool": "build_copilot_recipe",
                                            "image": source.get("data", ""),
                                            "url": "http://copilot-recipe-generator:5013",
                                        })
                                    except Exception:
                                        pass

                            msg = result.get("message", str(result.get("error", "Unknown result")))
                            recipe = result.get("recipe_text", "")

                            if recipe:
                                # CONSTRAINT 2: Save recipe and deliver as clickable download.
                                # Chat widget doesn't render markdown links, so we use a
                                # direct URL format and also send the file inline.
                                _recipe_fname = f"copilot_recipe_{uuid.uuid4().hex[:8]}.md"
                                _recipe_path = os.path.join(tempfile.gettempdir(), _recipe_fname)
                                with open(_recipe_path, "w", encoding="utf-8") as rf:
                                    rf.write(recipe)
                                _recipe_id = str(uuid.uuid4())
                                _generated_images[_recipe_id] = _recipe_path
                                _download_url = f"/api/chat/image/{_recipe_id}"

                                # Show recipe preview (first 1500 chars)
                                full_msg = (
                                    f"Your Copilot Studio recipe is ready! ({len(recipe):,} characters)\n\n"
                                    f"**Recipe Preview:**\n```\n{recipe[:1500]}\n```\n\n"
                                )
                                if len(recipe) > 1500:
                                    full_msg += f"*(Showing first 1,500 of {len(recipe):,} characters)*\n\n"

                                # Direct download URL (plain text - always works)
                                full_msg += f"DOWNLOAD: {client_url}{_download_url}\n\n"
                                full_msg += f"View/edit in Recipe Generator: {client_url}"

                                await ws.send_json({"type": "text_delta", "content": full_msg})

                                # Also send the download as an inline link the widget can render
                                try:
                                    await ws.send_json({
                                        "type": "inline_image",
                                        "url": _download_url,
                                        "alt": f"Download: {_recipe_fname}",
                                    })
                                except Exception:
                                    pass

                                logger.info("Recipe delivered: %d chars, download at %s", len(recipe), _download_url)
                            else:
                                full_msg = (
                                    f"{msg}\n\n"
                                    f"The recipe generation did not return content. "
                                    f"Please try using the Recipe Generator directly: {client_url}"
                                )
                                await ws.send_json({"type": "text_delta", "content": full_msg})

                            await ws.send_json({
                                "type": "message_complete",
                                "turns": 0,
                                "tools_used": [],
                            })
                            conv_ref["history"].append({
                                "role": "assistant",
                                "content": full_msg,
                            })

                        except Exception as e:
                            logger.exception("Background recipe generation failed: %s", e)
                            try:
                                await ws.send_json({
                                    "type": "text_delta",
                                    "content": f"\n\nRecipe generation failed: {str(e)[:200]}. Try the app directly: {client_url}",
                                })
                                await ws.send_json({
                                    "type": "message_complete",
                                    "turns": 0,
                                    "tools_used": [],
                                })
                            except Exception:
                                pass

                    asyncio.create_task(
                        _generate_recipe_background(
                            websocket, conv, user_message or "", _client_url,
                        )
                    )

                    continue

                except Exception as e:
                    logger.exception("Deterministic Copilot recipe shortcut failed: %s", e)

            # -----------------------------------------------------------
            # Deterministic shortcut: Character Generator.
            # -----------------------------------------------------------
            _character_keywords = [
                "character design", "character sheet", "consistent character",
                "character image",
            ]
            _wants_character = any(kw in _msg_lower for kw in _character_keywords)
            # Also match if "character" appears with a generation verb
            if not _wants_character and not _wants_journey and not _wants_reddit and not _wants_transcribe and not _wants_copilot:
                _has_char_word = "character" in _msg_lower
                _has_gen_verb = any(v in _msg_lower for v in ["generate", "create", "make", "design"])
                _wants_character = _has_char_word and _has_gen_verb

            if _wants_character:
                try:
                    from app.tools.cx_services import GenerateCharacterComputerTool
                    from app.tools.base import AgentContext

                    # P0: AI extraction replaces fragile regex for name/description
                    _char_params = await _ai_extract_params(user_message or "", "character_gen")
                    _char_name = (_char_params.get("name") or "").strip()
                    _char_desc = (_char_params.get("description") or "").strip()

                    # If no name was explicitly given, ask the user
                    if not _char_name:
                        # Store intent so we can resume after they reply
                        conv["_pending_character"] = {
                            "description": _char_desc,
                        }
                        await websocket.send_json({
                            "type": "text_delta",
                            "content": (
                                "I can generate a character for you! "
                                "What would you like to name this character?"
                            ),
                        })
                        await websocket.send_json({
                            "type": "message_complete",
                            "turns": 1,
                            "tools_used": [],
                        })
                        conv["history"].append({"role": "user", "content": user_message})
                        conv["history"].append({
                            "role": "assistant",
                            "content": "I can generate a character for you! What would you like to name this character?",
                        })
                        continue

                    # Check for uploaded reference images
                    _ref_image = ""
                    if conv["files"]:
                        for f in conv["files"]:
                            ext = os.path.splitext(f["name"])[1].lower()
                            if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                                _ref_image = f["path"]
                                break

                    await websocket.send_json({
                        "type": "status",
                        "message": "Generating character...",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "computer",
                        "description": "Opening Character Generator",
                    })
                    await websocket.send_json({
                        "type": "tool_start",
                        "tool": "generate_character_browser",
                        "description": f"Generating character",
                    })

                    tool = GenerateCharacterComputerTool()
                    ctx = AgentContext(
                        session_id=conversation_id, agent_slug=agent_slug,
                    )
                    result = await tool.execute({
                        "description": _char_desc or _char_name,
                        "character_name": _char_name,
                        "reference_image_path": _ref_image,
                    }, ctx)

                    # Send screenshot
                    ss = result.get("screenshot")
                    if ss and isinstance(ss, dict) and ss.get("type") == "image":
                        source = ss.get("source", {})
                        if source.get("type") == "base64":
                            await websocket.send_json({
                                "type": "screenshot",
                                "tool": "generate_character_browser",
                                "image": source.get("data", ""),
                                "url": "http://consistent-character-generator:5010",
                            })

                    msg = result.get("message", str(result.get("error", "Unknown result")))
                    _client_url = os.environ.get(
                        "CONSISTENT_CHARACTER_GENERATOR_CLIENT_URL", "http://localhost:5010"
                    )

                    # Flush text + complete FIRST so the message renders,
                    # then send images AFTER so they appear below the text.
                    await websocket.send_json({"type": "text_delta", "content": msg})
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "generate_character_browser",
                        "summary": msg[:300],
                    })
                    await websocket.send_json({
                        "type": "message_complete",
                        "turns": 1,
                        "tools_used": ["generate_character_browser"],
                    })

                    # Now send character images as inline HTTP URLs
                    exported = result.get("exported_characters", [])
                    logger.info("Character export: %d characters to send inline", len(exported))
                    for ef in exported:
                        fpath = ef.get("path", "")
                        if fpath and os.path.exists(fpath):
                            img_id = str(uuid.uuid4())
                            _generated_images[img_id] = fpath
                            name = ef.get("name", "Character")
                            img_url = f"/api/chat/image/{img_id}"
                            logger.info("Serving character image via HTTP: %s -> %s", name, img_url)
                            try:
                                await websocket.send_json({
                                    "type": "inline_image",
                                    "url": img_url,
                                    "alt": name,
                                })
                            except Exception as send_err:
                                logger.error("Failed to send character image URL: %s", send_err)
                    conv["history"].append({"role": "user", "content": user_message})
                    conv["history"].append({"role": "assistant", "content": msg})

                    continue

                except Exception as e:
                    logger.exception("Deterministic character gen shortcut failed: %s", e)

            # Stream the agent execution
            accumulated_text = ""
            tools_used = []
            turns = 0

            try:
                await websocket.send_json({"type": "status", "message": "Starting..."})

                async for event in engine.run_stream(
                    agent_slug=agent_slug,
                    session_id=conversation_id,
                    user_message=user_content,
                    history=conv["history"],
                ):
                    evt_type = event.get("type", "")

                    if evt_type == "tool_start":
                        tool_name = event.get("tool", "")
                        params = event.get("params", {})
                        action = params.get("action", "") if isinstance(params, dict) else ""
                        tools_used.append(tool_name)

                        # Human-readable tool description
                        descriptions = {
                            "computer": f"Browser: {action}" if action else "Using browser",
                            "search_reddit": "Searching Reddit",
                            "collect_reddit_data": "Collecting Reddit data",
                            "transcribe_video_browser": "Transcribing video",
                            "build_copilot_recipe": "Building Copilot recipe",
                            "generate_character_browser": "Generating character",
                            "generate_journey_map": "Generating journey map",
                            "analyze_social_data": "Analyzing social data",
                            "transcribe_video": "Transcribing video",
                            "web_search": "Searching the web",
                            "generate_prototype": "Building prototype",
                            "fetch_figma_data": "Fetching Figma data",
                            "get_figma_components": "Listing Figma components",
                            "generate_image": "Generating image",
                        }
                        desc = descriptions.get(tool_name, f"Using {tool_name}")

                        await websocket.send_json({
                            "type": "tool_start",
                            "tool": tool_name,
                            "description": desc,
                        })

                    elif evt_type == "tool_result":
                        tool_name = event.get("tool", "")
                        result = event.get("result")
                        error = event.get("error")

                        if error:
                            await websocket.send_json({
                                "type": "tool_error",
                                "tool": tool_name,
                                "error": str(error)[:200],
                            })
                        elif result and isinstance(result, dict):
                            # Check if this is a screenshot (image result)
                            if result.get("type") == "image" and "source" in result:
                                source = result["source"]
                                if source.get("type") == "base64":
                                    await websocket.send_json({
                                        "type": "screenshot",
                                        "tool": tool_name,
                                        "image": source.get("data", ""),
                                        "url": result.get("current_url", ""),
                                    })
                            else:
                                # Non-image tool result -- send brief summary
                                summary = str(result)[:300]
                                await websocket.send_json({
                                    "type": "tool_result",
                                    "tool": tool_name,
                                    "summary": summary,
                                })

                    elif evt_type == "text_delta":
                        content = event.get("content", "")
                        accumulated_text += content
                        # Send partial text so user sees reasoning in real-time
                        await websocket.send_json({
                            "type": "text_delta",
                            "content": content,
                        })

                    elif evt_type in ("thinking", "status"):
                        msg = event.get("message", "")
                        await websocket.send_json({
                            "type": "status",
                            "message": msg,
                        })

                    elif evt_type == "done":
                        turns = event.get("turns", 0)
                        # done event -- text_deltas already sent

                    elif evt_type == "error":
                        await websocket.send_json({
                            "type": "error",
                            "content": event.get("error", "Unknown error"),
                        })

                # Send final message marker
                await websocket.send_json({
                    "type": "message_complete",
                    "turns": turns,
                    "tools_used": list(set(tools_used)),
                })

                # ---------------------------------------------------------
                # Post-completion hook: if the browser is on the Recipe
                # Generator and a recipe was generated, extract it from
                # the DOM, save to /tmp, and deliver a download link.
                # This is safe: if the page isn't on the recipe generator
                # or no content exists, it silently does nothing.
                # ---------------------------------------------------------
                try:
                    import app.tools.computer_use as _cu
                    if _cu._page and not _cu._page.is_closed():
                        _page_url = _cu._page.url or ""
                        if "copilot-recipe-generator" in _page_url or "5013" in _page_url:
                            # Try to extract recipe content from React state via the DOM
                            _extracted = await _cu._page.evaluate('''() => {
                                // The ExportPanel receives content as a prop.
                                // The "Copy to Clipboard" button copies the full recipe.
                                // We can also look for the recipe content in the rendered DOM.
                                const exportPanel = document.querySelector('.export-panel');
                                if (!exportPanel) return null;

                                // Method 1: Try to get content from the recipe display area
                                const recipeEl = document.querySelector('.recipe-content, .recipe-display, .recipe-output, [class*="recipe"]');
                                if (recipeEl && recipeEl.innerText && recipeEl.innerText.length > 200) {
                                    return recipeEl.innerText;
                                }

                                // Method 2: Simulate the copy-to-clipboard to get the raw content
                                // The ExportPanel component stores content in a closure.
                                // We can trigger the markdown download and intercept it.
                                // Safest: read from the rendered markdown container.
                                const markdownEls = document.querySelectorAll('.recipe-content pre, .recipe-display pre, [class*="recipe"] pre, .markdown-body');
                                for (const el of markdownEls) {
                                    if (el.innerText && el.innerText.length > 200) {
                                        return el.innerText;
                                    }
                                }

                                // Method 3: Get ALL text from the main content area
                                const mainContent = document.querySelector('main, .app-content, #root > div');
                                if (mainContent) {
                                    // Find the largest text block (the recipe)
                                    const allText = mainContent.innerText;
                                    if (allText && allText.length > 500) {
                                        return allText;
                                    }
                                }

                                return null;
                            }''')

                            if _extracted and len(_extracted) > 200:
                                # Save to /tmp
                                _recipe_fname = f"copilot_recipe_{uuid.uuid4().hex[:8]}.md"
                                _recipe_path = os.path.join(tempfile.gettempdir(), _recipe_fname)
                                with open(_recipe_path, "w", encoding="utf-8") as rf:
                                    rf.write(_extracted)
                                _recipe_id = str(uuid.uuid4())
                                _generated_images[_recipe_id] = _recipe_path
                                _dl_url = f"/api/chat/image/{_recipe_id}"
                                _client_url = os.environ.get(
                                    "COPILOT_RECIPE_GENERATOR_CLIENT_URL", "http://localhost:5013"
                                )

                                _dl_msg = (
                                    f"\n\nYour recipe ({len(_extracted):,} characters) is ready for download:\n"
                                    f"{_client_url}{_dl_url}"
                                )
                                await websocket.send_json({"type": "text_delta", "content": _dl_msg})
                                await websocket.send_json({
                                    "type": "message_complete",
                                    "turns": 0,
                                    "tools_used": [],
                                })
                                logger.info("Recipe extracted from browser: %d chars, saved to %s", len(_extracted), _recipe_path)
                except Exception as hook_err:
                    # Never let the hook break the main flow
                    logger.debug("Recipe extraction hook: %s", hook_err)

                # Update history — include file context so agent remembers uploads
                history_content = user_message or "[file]"
                if file_path:
                    fname = os.path.basename(file_path)
                    history_content = f"{history_content}\n[User uploaded file: {fname}, saved at: {file_path}]"
                conv["history"].append({"role": "user", "content": history_content})
                conv["history"].append({"role": "assistant", "content": accumulated_text})
                if len(conv["history"]) > 40:
                    conv["history"] = conv["history"][-40:]

            except Exception as e:
                logger.exception("WS stream error: %s", e)
                await websocket.send_json({"type": "error", "content": str(e)})

    except WebSocketDisconnect:
        logger.info("WS disconnected: %s", conversation_id)
    except Exception as e:
        logger.exception("WS error: %s", e)
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
    finally:
        # Clear active WS reference (monitor will store result in conv instead)
        if conv.get("_active_ws") is websocket:
            conv["_active_ws"] = None


@router.post("/refresh-tools")
async def refresh_tools():
    """Compatibility endpoint — no-op since NXT Agency tools are registered at startup."""
    return {
        "status": "success",
        "message": "NXT Agency tools are registered at startup and always available.",
    }
