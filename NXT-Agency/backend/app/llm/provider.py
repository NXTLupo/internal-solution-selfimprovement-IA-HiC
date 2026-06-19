"""
Abstract base classes and shared data structures for the LLM provider layer.

All providers implement LLMProvider, returning LLMResponse (non-streaming)
or yielding LLMStreamChunk (streaming).  The unified tool format uses:

    {"name": "...", "description": "...", "parameters": {"type": "object", ...}}

Each concrete provider is responsible for converting this into its native
tool-calling wire format.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional


@dataclass
class ToolCall:
    """A single tool invocation returned by the model."""

    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMResponse:
    """Complete (non-streaming) response from any LLM provider."""

    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"
    input_tokens: int = 0
    output_tokens: int = 0
    model: str = ""


@dataclass
class LLMStreamChunk:
    """
    A single chunk emitted during streaming.

    type values:
        text_delta        - partial text content
        tool_call_start   - beginning of a tool call (tool_call.id and name set)
        tool_call_delta   - partial JSON arguments for the current tool call
        done              - stream finished; usage dict may be populated
    """

    type: str
    content: str = ""
    tool_call: Optional[ToolCall] = None
    usage: Optional[dict[str, int]] = None


class LLMProvider(ABC):
    """
    Abstract interface that every LLM backend must implement.

    Concrete providers receive tools in the *unified* format and are
    responsible for translating them into the vendor-specific wire format.
    """

    @abstractmethod
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
        """Send a non-streaming chat completion request."""
        ...

    @abstractmethod
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
        """Return an async iterator of streaming chunks."""
        ...
