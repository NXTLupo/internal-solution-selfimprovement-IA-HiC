"""
Anthropic (Claude) provider using the native Messages API with tool use.

Wire format reference:
    tools = [{"name": ..., "description": ..., "input_schema": {...}}]
    response content blocks may be "text" or "tool_use".

IMPORTANT: All calls use the streaming API internally to avoid the
Anthropic 10-minute timeout on non-streaming requests.  The ``chat()``
method collects the full streamed response and returns it as a single
``LLMResponse``.
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

import anthropic

from .provider import LLMProvider, LLMResponse, LLMStreamChunk, ToolCall

logger = logging.getLogger(__name__)

_STOP_REASON_MAP: dict[str, str] = {
    "end_turn": "end_turn",
    "tool_use": "tool_use",
    "max_tokens": "max_tokens",
    "stop_sequence": "stop_sequence",
}


def _convert_tools(
    tools: list[dict] | None,
) -> tuple[list[dict[str, Any]] | anthropic.NotGiven, list[str]]:
    """Convert unified tool defs to Anthropic's native format.

    Returns ``(converted_tools, beta_flags)``.

    Anthropic-defined tools (those whose dict contains a ``type`` field
    starting with ``computer_``, ``bash_``, or ``text_editor_``) are
    passed through verbatim -- they must NOT be converted to the
    ``{name, description, input_schema}`` shape.

    Custom tools get their ``parameters`` key renamed to ``input_schema``
    as required by the Anthropic Messages API.
    """
    if not tools:
        return anthropic.NOT_GIVEN, []

    converted: list[dict[str, Any]] = []
    betas: set[str] = set()

    for tool in tools:
        tool_type = tool.get("type", "")
        if tool_type and tool_type.startswith(("computer_", "bash_", "text_editor_")):
            # Anthropic-defined tool -- pass through directly
            converted.append(tool)
            # Detect which beta flag is needed
            if "20251124" in tool_type:
                betas.add("computer-use-2025-11-24")
            elif "20250124" in tool_type or "20250728" in tool_type:
                betas.add("computer-use-2025-01-24")
        else:
            # Custom tool -- convert parameters -> input_schema
            converted.append(
                {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "input_schema": tool.get(
                        "parameters", {"type": "object", "properties": {}}
                    ),
                }
            )

    return converted, sorted(betas)


def _parse_tool_calls(content_blocks: list[Any]) -> tuple[str, list[ToolCall]]:
    """Extract text and tool calls from Anthropic content blocks."""
    text_parts: list[str] = []
    tool_calls: list[ToolCall] = []
    for block in content_blocks:
        if block.type == "text":
            text_parts.append(block.text)
        elif block.type == "tool_use":
            tool_calls.append(
                ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input if isinstance(block.input, dict) else {},
                )
            )
    return "\n".join(text_parts), tool_calls


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider using the async Messages API.

    Both ``chat()`` and ``chat_stream()`` use the streaming transport
    (``messages.stream()``) so that long-running Opus requests never hit
    Anthropic's 10-minute non-streaming timeout.
    """

    def __init__(self, api_key: str, default_model: str = "claude-sonnet-4-20250514"):
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._default_model = default_model

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
        """Send a chat request using streaming internally to avoid timeouts.

        Collects the complete streamed response and returns it as a single
        ``LLMResponse`` — callers see no difference from the old non-streaming
        path, but the underlying transport is streaming.
        """
        resolved_model = model or self._default_model
        native_tools, betas = _convert_tools(tools)

        try:
            # Both paths use streaming to avoid Anthropic's 10-minute non-streaming timeout.
            # The beta path uses beta.messages.stream() with betas= parameter.
            if betas:
                async with self._client.beta.messages.stream(
                    model=resolved_model,
                    system=system,
                    messages=messages,
                    tools=native_tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    betas=betas,
                ) as stream:
                    final_message = await stream.get_final_message()
            else:
                async with self._client.messages.stream(
                    model=resolved_model,
                    system=system,
                    messages=messages,
                    tools=native_tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ) as stream:
                    final_message = await stream.get_final_message()

        except anthropic.APIStatusError as exc:
            logger.error("Anthropic API error %s: %s", exc.status_code, exc.message)
            raise
        except anthropic.APIConnectionError as exc:
            logger.error("Anthropic connection error: %s", exc)
            raise

        text, tool_calls = _parse_tool_calls(final_message.content)
        stop_reason = _STOP_REASON_MAP.get(
            final_message.stop_reason, final_message.stop_reason
        )

        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            input_tokens=final_message.usage.input_tokens,
            output_tokens=final_message.usage.output_tokens,
            model=final_message.model,
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
        resolved_model = model or self._default_model
        native_tools, betas = _convert_tools(tools)

        try:
            # Both paths use streaming to avoid Anthropic's 10-minute timeout.
            kwargs = dict(
                model=resolved_model,
                system=system,
                messages=messages,
                tools=native_tools,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            if betas:
                stream_cm = self._client.beta.messages.stream(**kwargs, betas=betas)
            else:
                stream_cm = self._client.messages.stream(**kwargs)

            async with stream_cm as stream:
                current_tool_id: str | None = None
                current_tool_name: str | None = None
                current_tool_json = ""

                async for event in stream:
                    if event.type == "content_block_delta":
                        delta = event.delta
                        if hasattr(delta, "text"):
                            yield LLMStreamChunk(type="text_delta", content=delta.text)
                        elif hasattr(delta, "partial_json"):
                            current_tool_json += delta.partial_json
                            yield LLMStreamChunk(
                                type="tool_call_delta",
                                content=delta.partial_json,
                            )

                    elif event.type == "content_block_start":
                        block = event.content_block
                        if hasattr(block, "type") and block.type == "tool_use":
                            current_tool_id = block.id
                            current_tool_name = block.name
                            current_tool_json = ""
                            yield LLMStreamChunk(
                                type="tool_call_start",
                                tool_call=ToolCall(
                                    id=block.id,
                                    name=block.name,
                                    arguments={},
                                ),
                            )

                    elif event.type == "content_block_stop":
                        if current_tool_id and current_tool_name:
                            try:
                                args = json.loads(current_tool_json) if current_tool_json else {}
                            except json.JSONDecodeError:
                                logger.warning(
                                    "Failed to parse tool args for %s: %s",
                                    current_tool_name,
                                    current_tool_json[:200],
                                )
                                args = {}
                            yield LLMStreamChunk(
                                type="tool_call_delta",
                                tool_call=ToolCall(
                                    id=current_tool_id,
                                    name=current_tool_name,
                                    arguments=args,
                                ),
                            )
                            current_tool_id = None
                            current_tool_name = None
                            current_tool_json = ""

                    elif event.type == "message_delta":
                        pass

                final_message = await stream.get_final_message()
                yield LLMStreamChunk(
                    type="done",
                    usage={
                        "input_tokens": final_message.usage.input_tokens,
                        "output_tokens": final_message.usage.output_tokens,
                    },
                )

        except anthropic.APIStatusError as exc:
            logger.error("Anthropic stream API error %s: %s", exc.status_code, exc.message)
            raise
        except anthropic.APIConnectionError as exc:
            logger.error("Anthropic stream connection error: %s", exc)
            raise
