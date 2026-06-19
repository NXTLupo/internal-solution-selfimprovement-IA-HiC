"""
LLM Provider Abstraction Layer
===============================

Unified interface for routing requests to Anthropic (Claude), OpenAI, and
Google (Gemini) APIs using their native tool-calling capabilities.

Quick start:
    from app.llm import ModelRouter

    router = ModelRouter()
    response = await router.chat(
        model_key="claude-sonnet",
        system="You are a helpful assistant.",
        messages=[{"role": "user", "content": "Hello"}],
        tools=[{
            "name": "get_weather",
            "description": "Get current weather",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        }],
    )
"""

from .provider import LLMProvider, LLMResponse, LLMStreamChunk, ToolCall
from .anthropic_provider import AnthropicProvider
from .openai_provider import OpenAIProvider
from .gemini_provider import GeminiProvider
from .router import ModelRouter, MODEL_MAP

__all__ = [
    "LLMProvider",
    "LLMResponse",
    "LLMStreamChunk",
    "ToolCall",
    "AnthropicProvider",
    "OpenAIProvider",
    "GeminiProvider",
    "ModelRouter",
    "MODEL_MAP",
]
