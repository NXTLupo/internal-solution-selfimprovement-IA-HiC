"""
Google Gemini provider using the native generative AI SDK with function calling.

Wire format reference:
    tools = [Tool(function_declarations=[FunctionDeclaration(name=..., ...)])]
    Response parts may contain FunctionCall objects.
"""

from __future__ import annotations

import base64
import logging
import uuid
from collections import OrderedDict
from typing import Any, AsyncIterator

from google import genai
from google.genai import types

from . import seats
from .provider import LLMProvider, LLMResponse, LLMStreamChunk, ToolCall

logger = logging.getLogger(__name__)

# 2026-11-11 (IA plan Phase 0, section 6.10): Gemini 3.x and 4 reject a replayed function-call turn that lacks the
# thought_signature its response carried (400 "Function call is missing a thought_signature in functionCall
# parts"). The engine's history keeps only a tool_use block's id, name and input, so the provider remembers each
# call's signature under a call id that is unique across turns, and puts it back when the history is replayed.
_SIGNATURES: "OrderedDict[str, bytes]" = OrderedDict()
_SIGNATURE_CAP = 4096


def _new_call_id() -> str:
    return f"gemini_call_{uuid.uuid4().hex[:16]}"


def _remember_signature(call_id: str, part: Any) -> None:
    sig = getattr(part, "thought_signature", None)
    if sig:
        _SIGNATURES[call_id] = sig
        while len(_SIGNATURES) > _SIGNATURE_CAP:
            _SIGNATURES.popitem(last=False)


def _convert_tools(tools: list[dict] | None) -> list[types.Tool] | None:
    """Convert unified tool defs to Gemini FunctionDeclaration format."""
    if not tools:
        return None
    declarations: list[types.FunctionDeclaration] = []
    for tool in tools:
        declarations.append(
            types.FunctionDeclaration(
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=tool.get("parameters", {"type": "object", "properties": {}}),
            )
        )
    return [types.Tool(function_declarations=declarations)]


def _extract_response(response: Any) -> tuple[str, list[ToolCall]]:
    """Parse text and function calls from a Gemini response."""
    text_parts: list[str] = []
    tool_calls: list[ToolCall] = []

    for candidate in response.candidates or []:
        if not candidate.content or not candidate.content.parts:
            continue
        for part in candidate.content.parts:
            if part.text is not None:
                text_parts.append(part.text)
            if part.function_call is not None:
                fc = part.function_call
                args = dict(fc.args) if fc.args else {}
                call_id = _new_call_id()
                _remember_signature(call_id, part)
                tool_calls.append(
                    ToolCall(
                        id=call_id,
                        name=fc.name,
                        arguments=args,
                    )
                )

    return "\n".join(text_parts), tool_calls


class GeminiProvider(LLMProvider):
    """Google Gemini provider using the google-genai SDK."""

    def __init__(self, api_key: str, default_model: str | None = None):
        self._client = genai.Client(api_key=api_key)
        # None -> the routing authority's chat seat, resolved per call (see seats.py).
        self._default_model = default_model

    def _model_or_default(self, model: str | None) -> str:
        return model or self._default_model or seats.seat_model(
            "NXT_AGENCY_GEMINI_CHAT_MODEL", ("seats", "chat"), seats.GEMINI_CHAT_FALLBACK, "gemini-")

    async def chat(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        *,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model: str | None = None,
    ) -> LLMResponse:
        resolved_model = self._model_or_default(model)
        native_tools = _convert_tools(tools)

        # Build Gemini content list from messages.
        contents = _build_contents(messages)

        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=native_tools,
        )

        try:
            response = await self._client.aio.models.generate_content(
                model=resolved_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            logger.error("Gemini API error: %s", exc)
            raise

        text, tool_calls = _extract_response(response)

        # Determine stop reason
        stop_reason = "end_turn"
        if tool_calls:
            stop_reason = "tool_use"
        elif response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, "finish_reason") and candidate.finish_reason:
                fr = str(candidate.finish_reason).lower()
                if "max_tokens" in fr or "length" in fr:
                    stop_reason = "max_tokens"
                elif "safety" in fr:
                    stop_reason = "safety"

        # Usage metadata
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0

        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=resolved_model,
        )

    async def chat_stream(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        *,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        model: str | None = None,
    ) -> AsyncIterator[LLMStreamChunk]:
        resolved_model = self._model_or_default(model)
        native_tools = _convert_tools(tools)
        contents = _build_contents(messages)

        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            temperature=temperature,
            max_output_tokens=max_tokens,
            tools=native_tools,
        )

        try:
            stream = await self._client.aio.models.generate_content_stream(
                model=resolved_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            logger.error("Gemini stream error: %s", exc)
            raise

        total_input = 0
        total_output = 0

        async for chunk in stream:
            # Usage metadata (may appear on each chunk or only the last)
            if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                total_input = getattr(chunk.usage_metadata, "prompt_token_count", 0) or 0
                total_output = getattr(chunk.usage_metadata, "candidates_token_count", 0) or 0

            if not chunk.candidates:
                continue

            for candidate in chunk.candidates:
                if not candidate.content or not candidate.content.parts:
                    continue
                for part in candidate.content.parts:
                    if part.text is not None:
                        yield LLMStreamChunk(type="text_delta", content=part.text)

                    if part.function_call is not None:
                        fc = part.function_call
                        args = dict(fc.args) if fc.args else {}
                        call_id = _new_call_id()
                        _remember_signature(call_id, part)
                        tc = ToolCall(
                            id=call_id,
                            name=fc.name,
                            arguments=args,
                        )
                        yield LLMStreamChunk(type="tool_call_start", tool_call=tc)
                        # Gemini delivers complete function calls per chunk (no partial JSON),
                        # so we immediately emit the finished call as well.
                        yield LLMStreamChunk(type="tool_call_delta", tool_call=tc)

        yield LLMStreamChunk(
            type="done",
            usage={"input_tokens": total_input, "output_tokens": total_output},
        )


def _build_contents(messages: list[dict]) -> list[types.Content]:
    """
    Convert our standard message format to Gemini Content objects.

    Supports role mapping:
        "user"      -> "user"
        "assistant" -> "model"
        "tool"      -> "user" with FunctionResponse part

    Supports multimodal content blocks:
        {"type": "image", "source": {"type": "base64", "media_type": "...", "data": "..."}}
        -> types.Part(inline_data=types.Blob(mime_type=..., data=...))
    """
    contents: list[types.Content] = []
    # tool_use id -> function name, so a tool_result answers the function by name (Gemini matches on name).
    call_names: dict[str, str] = {}
    for msg in messages:
        blocks = msg.get("content")
        if isinstance(blocks, list):
            for block in blocks:
                if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("id"):
                    call_names[block["id"]] = block.get("name", "unknown")

    for msg in messages:
        role = msg.get("role", "user")

        # Tool result messages
        if role == "tool":
            contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part(
                            function_response=types.FunctionResponse(
                                name=msg.get("name", "unknown"),
                                response={"result": msg.get("content", "")},
                            )
                        )
                    ],
                )
            )
            continue

        # Map assistant -> model for Gemini
        gemini_role = "model" if role == "assistant" else "user"

        content = msg.get("content", "")

        # Handle content that is a list of content blocks (multi-modal / tool_use results)
        if isinstance(content, list):
            parts: list[types.Part] = []
            for block in content:
                if isinstance(block, dict):
                    block_type = block.get("type", "text")
                    if block_type == "text":
                        parts.append(types.Part(text=block["text"]))
                    elif block_type == "image":
                        # Convert our unified image format to Gemini inline_data
                        source = block.get("source", {})
                        media_type = source.get("media_type", "image/png")
                        data_b64 = source.get("data", "")
                        raw_bytes = base64.b64decode(data_b64)
                        parts.append(
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=media_type,
                                    data=raw_bytes,
                                )
                            )
                        )
                    elif block_type == "document":
                        # Convert document blocks (PDFs, etc.) to Gemini inline_data
                        source = block.get("source", {})
                        media_type = source.get("media_type", "application/pdf")
                        data_b64 = source.get("data", "")
                        raw_bytes = base64.b64decode(data_b64)
                        parts.append(
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=media_type,
                                    data=raw_bytes,
                                )
                            )
                        )
                    elif block_type == "tool_result":
                        call_id = block.get("tool_use_id", "")
                        parts.append(
                            types.Part(
                                function_response=types.FunctionResponse(
                                    name=call_names.get(call_id, call_id or "unknown"),
                                    response={"result": block.get("content", "")},
                                )
                            )
                        )
                    elif block_type == "tool_use":
                        # Assistant tool_use blocks -> FunctionCall for Gemini, with the call's thought signature
                        part_kwargs: dict[str, Any] = {
                            "function_call": types.FunctionCall(
                                name=block.get("name", "unknown"),
                                args=block.get("input", {}),
                            )
                        }
                        signature = _SIGNATURES.get(block.get("id", ""))
                        if signature:
                            part_kwargs["thought_signature"] = signature
                        parts.append(types.Part(**part_kwargs))
                    else:
                        parts.append(types.Part(text=str(block)))
                else:
                    parts.append(types.Part(text=str(block)))
            contents.append(types.Content(role=gemini_role, parts=parts))
        else:
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part(text=str(content))],
                )
            )

    return contents
