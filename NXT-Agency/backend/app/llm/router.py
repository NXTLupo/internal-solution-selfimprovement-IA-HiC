"""
Model router that maps friendly model keys to provider/model-id pairs
and lazily initialises the correct provider on first use.

Usage:
    router = ModelRouter()
    response = await router.chat("claude-sonnet", system="You are helpful.", messages=[...])
"""

from __future__ import annotations

import logging
import os
from typing import AsyncIterator

from .provider import LLMProvider, LLMResponse, LLMStreamChunk

logger = logging.getLogger(__name__)

# ---- model key -> (provider_name, native_model_id) ----
MODEL_MAP: dict[str, tuple[str, str]] = {
    # Anthropic — Claude 4.6 (current flagship, March 2026)
    "claude-opus": ("anthropic", "claude-opus-4-6"),
    "claude-sonnet": ("anthropic", "claude-sonnet-4-6"),
    "claude-haiku": ("anthropic", "claude-haiku-4-5-20251001"),
    # Anthropic — Legacy (still available)
    "claude-sonnet-4.5": ("anthropic", "claude-sonnet-4-5-20250929"),
    "claude-opus-4.5": ("anthropic", "claude-opus-4-5-20251101"),
    "claude-opus-4.1": ("anthropic", "claude-opus-4-1-20250805"),
    "claude-sonnet-4": ("anthropic", "claude-sonnet-4-20250514"),

    # OpenAI — GPT-5 (latest flagship)
    "gpt-5": ("openai", "gpt-5"),
    "gpt-5-mini": ("openai", "gpt-5-mini"),
    # OpenAI — GPT-4.1 (1M context, great for code)
    "gpt-4.1": ("openai", "gpt-4.1"),
    "gpt-4.1-mini": ("openai", "gpt-4.1-mini"),
    "gpt-4.1-nano": ("openai", "gpt-4.1-nano"),
    # OpenAI — o-series reasoning
    "o3": ("openai", "o3"),
    "o3-pro": ("openai", "o3-pro"),
    "o4-mini": ("openai", "o4-mini"),
    # OpenAI — legacy
    "gpt-4o": ("openai", "gpt-4o"),
    "gpt-4o-mini": ("openai", "gpt-4o-mini"),

    # Google — Gemini 3.x (latest, Jan 2026+)
    "gemini-pro": ("google", "gemini-3.1-pro-preview"),
    "gemini-flash": ("google", "gemini-3.1-flash-lite-preview"),
    # Google — Gemini 2.5 (stable)
    "gemini-2.5-pro": ("google", "gemini-2.5-pro"),
    "gemini-2.5-flash": ("google", "gemini-2.5-flash"),
}

# Maps provider name -> (env var for API key, provider class import path)
_PROVIDER_CONFIG: dict[str, tuple[str, str]] = {
    "anthropic": ("ANTHROPIC_API_KEY", "AnthropicProvider"),
    "openai": ("OPENAI_API_KEY", "OpenAIProvider"),
    "google": ("GEMINI_API_KEY", "GeminiProvider"),
}


class ModelRouter:
    """
    Routes chat / chat_stream calls to the appropriate LLM provider
    based on a friendly model key (e.g. "claude-sonnet", "gpt-4o").

    Providers are lazily initialised on first use with API keys read
    from environment variables.
    """

    def __init__(self) -> None:
        self._providers: dict[str, LLMProvider] = {}

    def _get_provider(self, provider_name: str) -> LLMProvider:
        """Return a cached provider instance, creating it on first access."""
        if provider_name in self._providers:
            return self._providers[provider_name]

        if provider_name not in _PROVIDER_CONFIG:
            raise ValueError(f"Unknown provider: {provider_name!r}")

        env_var, class_name = _PROVIDER_CONFIG[provider_name]
        api_key = os.environ.get(env_var)
        if not api_key:
            raise EnvironmentError(
                f"Missing required environment variable {env_var!r} for provider {provider_name!r}. "
                f"Set it before using any {provider_name} model."
            )

        # Lazy imports to avoid requiring all SDKs when only one provider is used.
        if provider_name == "anthropic":
            from .anthropic_provider import AnthropicProvider
            provider: LLMProvider = AnthropicProvider(api_key=api_key)
        elif provider_name == "openai":
            from .openai_provider import OpenAIProvider
            provider = OpenAIProvider(api_key=api_key)
        elif provider_name == "google":
            from .gemini_provider import GeminiProvider
            provider = GeminiProvider(api_key=api_key)
        else:
            raise ValueError(f"No provider implementation for {provider_name!r}")

        self._providers[provider_name] = provider
        logger.info("Initialised %s provider (%s)", provider_name, class_name)
        return provider

    def _resolve(self, model_key: str) -> tuple[LLMProvider, str]:
        """Resolve a model key to (provider_instance, native_model_id)."""
        if model_key not in MODEL_MAP:
            available = ", ".join(sorted(MODEL_MAP))
            raise ValueError(
                f"Unknown model key {model_key!r}. Available keys: {available}"
            )
        provider_name, model_id = MODEL_MAP[model_key]
        return self._get_provider(provider_name), model_id

    async def chat(
        self,
        model_key: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        **kwargs,
    ) -> LLMResponse:
        """Route a non-streaming chat request to the appropriate provider."""
        provider, model_id = self._resolve(model_key)
        return await provider.chat(
            system=system,
            messages=messages,
            tools=tools,
            model=model_id,
            **kwargs,
        )

    async def chat_stream(
        self,
        model_key: str,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        **kwargs,
    ) -> AsyncIterator[LLMStreamChunk]:
        """Route a streaming chat request to the appropriate provider."""
        provider, model_id = self._resolve(model_key)
        async for chunk in provider.chat_stream(
            system=system,
            messages=messages,
            tools=tools,
            model=model_id,
            **kwargs,
        ):
            yield chunk

    def available_models(self) -> list[str]:
        """Return sorted list of available model keys."""
        return sorted(MODEL_MAP)

    def model_info(self, model_key: str) -> dict[str, str]:
        """Return provider name and native model ID for a given key."""
        if model_key not in MODEL_MAP:
            raise ValueError(f"Unknown model key: {model_key!r}")
        provider_name, model_id = MODEL_MAP[model_key]
        env_var = _PROVIDER_CONFIG[provider_name][0]
        return {
            "key": model_key,
            "provider": provider_name,
            "model_id": model_id,
            "api_key_env": env_var,
            "configured": bool(os.environ.get(env_var)),
        }
