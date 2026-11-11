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
from collections.abc import Iterator, Mapping
from typing import AsyncIterator

from . import seats
from .provider import LLMProvider, LLMResponse, LLMStreamChunk

logger = logging.getLogger(__name__)

# ---- model key -> (provider_name, native_model_id) ----
# 2026-11-11 (IA plan Phase 0, section 6.10 step 5): no model id lives here any more. Each friendly key names a
# seat at the platform's routing authority (GET /api/models on the research proxy) and resolves at call time:
# an explicit env override, then the proxy's seat, then a current fallback constant (see seats.py). The old keys
# stay valid so agent configs and the orchestration router keep working; legacy keys resolve to the same seat as
# their family.
_REASONING = ("NXT_AGENCY_REASONING_MODEL", ("seats", "reasoning"), seats.REASONING_FALLBACK)
_STRUCTURED = ("NXT_AGENCY_STRUCTURED_MODEL", ("seats", "structured"), seats.STRUCTURED_FALLBACK)
_FAST_CLAUDE = ("NXT_AGENCY_FAST_MODEL", ("seat_matrix", "fast", "secondary"), seats.FAST_CLAUDE_FALLBACK)
_OPENAI = ("NXT_AGENCY_OPENAI_MODEL", ("seat_matrix", "analysis", "secondary"), seats.OPENAI_FALLBACK)
_OPENAI_LIGHT = ("NXT_AGENCY_OPENAI_LIGHT_MODEL", None, seats.OPENAI_LIGHT_FALLBACK)
_GEMINI_RESEARCH = ("NXT_AGENCY_GEMINI_RESEARCH_MODEL", ("seat_matrix", "research", "primary"),
                    seats.GEMINI_RESEARCH_FALLBACK)
_GEMINI_CHAT = ("NXT_AGENCY_GEMINI_CHAT_MODEL", ("seats", "chat"), seats.GEMINI_CHAT_FALLBACK)

# key -> (provider_name, (env override, /api/models path, fallback id))
MODEL_SEATS: dict[str, tuple[str, tuple]] = {
    # Anthropic: opus keys -> reasoning seat, sonnet keys -> structured seat, haiku -> fast seat (Claude secondary)
    "claude-opus": ("anthropic", _REASONING),
    "claude-opus-4.5": ("anthropic", _REASONING),
    "claude-opus-4.1": ("anthropic", _REASONING),
    "claude-sonnet": ("anthropic", _STRUCTURED),
    "claude-sonnet-4.5": ("anthropic", _STRUCTURED),
    "claude-sonnet-4": ("anthropic", _STRUCTURED),
    "claude-haiku": ("anthropic", _FAST_CLAUDE),
    # OpenAI: flagship and reasoning keys -> the matrix's OpenAI analysis model; light keys -> gpt-5.5
    "gpt-5": ("openai", _OPENAI),
    "gpt-4.1": ("openai", _OPENAI),
    "o3": ("openai", _OPENAI),
    "o3-pro": ("openai", _OPENAI),
    "gpt-4o": ("openai", _OPENAI),
    "gpt-5-mini": ("openai", _OPENAI_LIGHT),
    "gpt-4.1-mini": ("openai", _OPENAI_LIGHT),
    "gpt-4.1-nano": ("openai", _OPENAI_LIGHT),
    "o4-mini": ("openai", _OPENAI_LIGHT),
    "gpt-4o-mini": ("openai", _OPENAI_LIGHT),
    # Google: pro keys (broad evidence intake) -> research seat; flash keys -> chat seat
    "gemini-pro": ("google", _GEMINI_RESEARCH),
    "gemini-2.5-pro": ("google", _GEMINI_RESEARCH),
    "gemini-flash": ("google", _GEMINI_CHAT),
    "gemini-2.5-flash": ("google", _GEMINI_CHAT),
}

_VENDOR_PREFIX: dict[str, str] = {"anthropic": "claude-", "openai": "gpt-", "google": "gemini-"}


def resolve_model(model_key: str) -> tuple[str, str]:
    """Resolve a friendly key to (provider_name, native_model_id) through the routing authority's seats."""
    provider_name, (env_var, path, fallback) = MODEL_SEATS[model_key]
    return provider_name, seats.seat_model(env_var, path, fallback, _VENDOR_PREFIX[provider_name])


def model_source(model_key: str) -> str:
    provider_name, (env_var, path, _fallback) = MODEL_SEATS[model_key]
    return seats.source_of(env_var, path, _VENDOR_PREFIX[provider_name])


class _SeatMap(Mapping):
    """Read-only view kept under the old name: MODEL_MAP[key] -> (provider_name, native_model_id), resolved live."""

    def __getitem__(self, key: str) -> tuple[str, str]:
        return resolve_model(key)

    def __iter__(self) -> Iterator[str]:
        return iter(MODEL_SEATS)

    def __len__(self) -> int:
        return len(MODEL_SEATS)


MODEL_MAP: Mapping[str, tuple[str, str]] = _SeatMap()


def seat_summary() -> dict[str, dict[str, str]]:
    """One row per distinct seat the keys use: the resolved id and where it came from (for /health and logs)."""
    out: dict[str, dict[str, str]] = {}
    for key in ("claude-opus", "claude-sonnet", "claude-haiku", "gpt-5", "gpt-5-mini", "gemini-pro", "gemini-flash"):
        provider_name, model_id = resolve_model(key)
        out[key] = {"provider": provider_name, "model_id": model_id, "source": model_source(key)}
    return out

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
        """Resolve a model key to (provider_instance, native_model_id) through the routing authority's seats."""
        if model_key not in MODEL_SEATS:
            available = ", ".join(sorted(MODEL_SEATS))
            raise ValueError(
                f"Unknown model key {model_key!r}. Available keys: {available}"
            )
        provider_name, model_id = resolve_model(model_key)
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
        return sorted(MODEL_SEATS)

    def model_info(self, model_key: str) -> dict[str, str]:
        """Return provider name, native model ID and its source for a given key."""
        if model_key not in MODEL_SEATS:
            raise ValueError(f"Unknown model key: {model_key!r}")
        provider_name, model_id = resolve_model(model_key)
        env_var = _PROVIDER_CONFIG[provider_name][0]
        return {
            "key": model_key,
            "provider": provider_name,
            "model_id": model_id,
            "source": model_source(model_key),
            "api_key_env": env_var,
            "configured": bool(os.environ.get(env_var)),
        }
