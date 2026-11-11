"""
OpenAI provider using the native Chat Completions API with function calling.

Wire format reference:
    tools = [{"type": "function", "function": {"name": ..., "description": ..., "parameters": {...}}}]
    response.choices[0].message.tool_calls contains function call results.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, AsyncIterator

import openai

from . import seats
from .provider import LLMProvider, LLMResponse, LLMStreamChunk, ToolCall

logger = logging.getLogger(__name__)

# 2026-11-11 (IA plan Phase 0, section 6.10): the reasoning-family OpenAI models (gpt-5.x, gpt-6.x, o-series)
# reject `temperature` with a 400, as the platform chokepoint records (proxy/model_registry.py
# OPENAI_NO_SAMPLING_RE). Every current chat model takes `max_completion_tokens`; `max_tokens` is refused by the
# same families.
_NO_SAMPLING_RE = re.compile(r"^(gpt-5|gpt-6|o[1-9])", re.I)


def _sampling_kwargs(model: str, temperature: float | None, tools: Any = None) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if temperature is not None and not _NO_SAMPLING_RE.search(model or ""):
        out["temperature"] = temperature
    # The GPT-6 family refuses function tools with reasoning on /v1/chat/completions (400: "use /v1/responses or set
    # reasoning_effort to 'none'"). This provider speaks chat completions, so tool turns on GPT-6 run without
    # reasoning until it moves to the Responses API.
    if tools and tools is not openai.NOT_GIVEN and (model or "").lower().startswith("gpt-6"):
        out["reasoning_effort"] = "none"
    return out


def _convert_tools(tools: list[dict] | None) -> list[dict[str, Any]] | openai.NOT_GIVEN:
    """Convert unified tool defs to OpenAI function-calling format."""
    if not tools:
        return openai.NOT_GIVEN
    converted: list[dict[str, Any]] = []
    for tool in tools:
        converted.append(
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("parameters", {"type": "object", "properties": {}}),
                },
            }
        )
    return converted


def _convert_content(content: Any) -> Any:
    """
    Convert our unified multimodal content blocks to OpenAI's format.

    Our format:
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "..."}}
    OpenAI format:
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
    """
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return content

    converted: list[dict[str, Any]] = []
    for block in content:
        if not isinstance(block, dict):
            converted.append({"type": "text", "text": str(block)})
            continue

        block_type = block.get("type", "text")

        if block_type == "text":
            converted.append({"type": "text", "text": block.get("text", "")})
        elif block_type == "image":
            source = block.get("source", {})
            media_type = source.get("media_type", "image/png")
            data = source.get("data", "")
            converted.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{data}",
                },
            })
        elif block_type == "document":
            # OpenAI supports PDFs as images via base64 data URL
            source = block.get("source", {})
            media_type = source.get("media_type", "application/pdf")
            data = source.get("data", "")
            filename = block.get("filename", "document")
            if media_type == "application/pdf":
                # OpenAI can process PDFs as file inputs
                converted.append({
                    "type": "file",
                    "file": {
                        "filename": filename,
                        "file_data": f"data:{media_type};base64,{data}",
                    },
                })
            else:
                # For other document types, note as text
                converted.append({
                    "type": "text",
                    "text": f"[Attached document: {filename} ({media_type})]",
                })
        elif block_type == "tool_use":
            converted.append(block)
        elif block_type == "tool_result":
            converted.append(block)
        else:
            converted.append({"type": "text", "text": str(block)})

    return converted


def _build_messages(system: str, messages: list[dict]) -> list[dict]:
    """Prepend the system prompt and convert multimodal content blocks."""
    result: list[dict] = []
    if system:
        result.append({"role": "system", "content": system})
    for msg in messages:
        converted = {**msg}
        if "content" in converted:
            converted["content"] = _convert_content(converted["content"])
        result.append(converted)
    return result


class OpenAIProvider(LLMProvider):
    """OpenAI provider using the async Chat Completions API."""

    def __init__(self, api_key: str, default_model: str | None = None):
        self._client = openai.AsyncOpenAI(api_key=api_key)
        # None -> the routing authority's OpenAI analysis model, resolved per call (see seats.py).
        self._default_model = default_model

    def _model_or_default(self, model: str | None) -> str:
        return model or self._default_model or seats.seat_model(
            "NXT_AGENCY_OPENAI_MODEL", ("seat_matrix", "analysis", "secondary"), seats.OPENAI_FALLBACK, "gpt-")

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
        full_messages = _build_messages(system, messages)

        try:
            response = await self._client.chat.completions.create(
                model=resolved_model,
                messages=full_messages,
                tools=native_tools,
                max_completion_tokens=max_tokens,
                **_sampling_kwargs(resolved_model, temperature, native_tools),
            )
        except openai.APIStatusError as exc:
            logger.error("OpenAI API error %s: %s", exc.status_code, exc.message)
            raise
        except openai.APIConnectionError as exc:
            logger.error("OpenAI connection error: %s", exc)
            raise

        choice = response.choices[0]
        message = choice.message

        # Parse text
        text = message.content or ""

        # Parse tool calls
        tool_calls: list[ToolCall] = []
        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                except json.JSONDecodeError:
                    logger.warning(
                        "Failed to parse tool args for %s: %s",
                        tc.function.name,
                        tc.function.arguments[:200],
                    )
                    args = {}
                tool_calls.append(
                    ToolCall(id=tc.id, name=tc.function.name, arguments=args)
                )

        # Map finish reason
        stop_map = {
            "stop": "end_turn",
            "tool_calls": "tool_use",
            "length": "max_tokens",
            "content_filter": "content_filter",
        }
        stop_reason = stop_map.get(choice.finish_reason, choice.finish_reason or "end_turn")

        usage = response.usage
        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            model=response.model,
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
        full_messages = _build_messages(system, messages)

        try:
            stream = await self._client.chat.completions.create(
                model=resolved_model,
                messages=full_messages,
                tools=native_tools,
                max_completion_tokens=max_tokens,
                **_sampling_kwargs(resolved_model, temperature, native_tools),
                stream=True,
                stream_options={"include_usage": True},
            )
        except openai.APIStatusError as exc:
            logger.error("OpenAI stream API error %s: %s", exc.status_code, exc.message)
            raise
        except openai.APIConnectionError as exc:
            logger.error("OpenAI stream connection error: %s", exc)
            raise

        # Accumulators for streamed tool calls keyed by tool-call index.
        tool_acc: dict[int, dict[str, Any]] = {}  # idx -> {"id", "name", "args_json"}

        async for chunk in stream:
            # Final chunk with usage only (choices is empty).
            if not chunk.choices:
                if chunk.usage:
                    yield LLMStreamChunk(
                        type="done",
                        usage={
                            "input_tokens": chunk.usage.prompt_tokens,
                            "output_tokens": chunk.usage.completion_tokens,
                        },
                    )
                continue

            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason

            # Text content
            if delta.content:
                yield LLMStreamChunk(type="text_delta", content=delta.content)

            # Tool call deltas
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    idx = tc_delta.index
                    if idx not in tool_acc:
                        # New tool call starting
                        tool_acc[idx] = {
                            "id": tc_delta.id or "",
                            "name": tc_delta.function.name if tc_delta.function else "",
                            "args_json": "",
                        }
                        if tc_delta.id and tc_delta.function and tc_delta.function.name:
                            yield LLMStreamChunk(
                                type="tool_call_start",
                                tool_call=ToolCall(
                                    id=tc_delta.id,
                                    name=tc_delta.function.name,
                                    arguments={},
                                ),
                            )
                    else:
                        # Update id/name if they arrive in later chunks
                        if tc_delta.id:
                            tool_acc[idx]["id"] = tc_delta.id
                        if tc_delta.function and tc_delta.function.name:
                            tool_acc[idx]["name"] = tc_delta.function.name

                    # Accumulate argument JSON fragments
                    if tc_delta.function and tc_delta.function.arguments:
                        tool_acc[idx]["args_json"] += tc_delta.function.arguments
                        yield LLMStreamChunk(
                            type="tool_call_delta",
                            content=tc_delta.function.arguments,
                        )

            # When stream signals stop, emit completed tool calls
            if finish_reason == "tool_calls":
                for idx in sorted(tool_acc):
                    acc = tool_acc[idx]
                    try:
                        args = json.loads(acc["args_json"]) if acc["args_json"] else {}
                    except json.JSONDecodeError:
                        logger.warning(
                            "Failed to parse streamed tool args for %s: %s",
                            acc["name"],
                            acc["args_json"][:200],
                        )
                        args = {}
                    yield LLMStreamChunk(
                        type="tool_call_delta",
                        tool_call=ToolCall(id=acc["id"], name=acc["name"], arguments=args),
                    )
                tool_acc.clear()

            if finish_reason == "stop":
                yield LLMStreamChunk(type="done")
