"""IA plan Phase 0, section 6.10 step 5 (2026-11-11): NXT Agency takes its model ids from the routing authority's
seats (research proxy /api/models), with an env override first and a current fallback last, and never sends a
request body the current model families reject. The proxy is stubbed; no request leaves the process."""
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.llm import seats  # noqa: E402
from app.llm import router as llm_router  # noqa: E402

PAYLOAD = {
    "seats": {"reasoning": "claude-opus-5-5", "structured": "claude-sonnet-5-5", "chat": "gemini-3.5-flash"},
    "seat_matrix": {
        "research": {"primary": "gemini-4-carbon", "serving": "claude-opus-5-5"},
        "analysis": {"primary": "claude-sonnet-5-5", "secondary": "gpt-6.1-terra"},
        "fast": {"primary": "gpt-6-luna", "secondary": "claude-haiku-5-5"},
        "search": {"primary": "gemini-4-argon", "serving": "gemini-3.5-flash"},
    },
}
RETIRED = {"claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-sonnet-4-20250514",
           "claude-opus-4-5-20251101", "claude-opus-4-1-20250805", "claude-sonnet-4-5-20250929", "gpt-5", "gpt-4o",
           "o3", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite-preview", "gemini-2.5-pro", "gemini-2.5-flash"}
ENV_VARS = ["NXT_AGENCY_REASONING_MODEL", "NXT_AGENCY_STRUCTURED_MODEL", "NXT_AGENCY_FAST_MODEL",
            "NXT_AGENCY_OPENAI_MODEL", "NXT_AGENCY_OPENAI_LIGHT_MODEL", "NXT_AGENCY_GEMINI_RESEARCH_MODEL",
            "NXT_AGENCY_GEMINI_CHAT_MODEL", "NXT_AGENCY_SEARCH_MODEL", "NXT_AGENCY_COMPUTER_USE_MODEL"]


@pytest.fixture(autouse=True)
def stub_proxy(monkeypatch):
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    state = {"payload": PAYLOAD, "fetches": 0}

    def fake_fetch():
        state["fetches"] += 1
        if isinstance(state["payload"], Exception):
            raise state["payload"]
        return state["payload"]

    monkeypatch.setattr(seats, "_fetch", fake_fetch)
    seats.reset_cache()
    yield state
    seats.reset_cache()


def test_keys_resolve_to_the_seats():
    assert llm_router.resolve_model("claude-opus") == ("anthropic", "claude-opus-5-5")
    assert llm_router.resolve_model("claude-sonnet") == ("anthropic", "claude-sonnet-5-5")
    assert llm_router.resolve_model("claude-haiku") == ("anthropic", "claude-haiku-5-5")
    assert llm_router.resolve_model("gemini-pro") == ("google", "gemini-4-carbon")
    assert llm_router.resolve_model("gemini-flash") == ("google", "gemini-3.5-flash")
    assert llm_router.resolve_model("gpt-5") == ("openai", "gpt-6.1-terra")
    assert llm_router.resolve_model("gpt-5-mini") == ("openai", "gpt-5.5")
    assert llm_router.model_source("claude-opus") == "proxy /api/models"
    # the old name still works as a live view
    assert llm_router.MODEL_MAP["claude-opus"] == ("anthropic", "claude-opus-5-5")
    assert "claude-sonnet" in llm_router.MODEL_MAP and len(llm_router.MODEL_MAP) == len(llm_router.MODEL_SEATS)


def test_every_key_avoids_retired_ids_with_and_without_the_proxy(stub_proxy):
    for payload in (PAYLOAD, RuntimeError("proxy down")):
        stub_proxy["payload"] = payload
        seats.reset_cache()
        for key in llm_router.MODEL_SEATS:
            provider, model_id = llm_router.resolve_model(key)
            assert model_id.startswith(llm_router._VENDOR_PREFIX[provider]), (key, model_id)
            assert model_id not in RETIRED, (key, model_id)
    assert llm_router.model_source("claude-opus") == "fallback constant"


def test_env_override_wins_and_a_foreign_vendor_seat_is_refused(monkeypatch, stub_proxy):
    monkeypatch.setenv("NXT_AGENCY_REASONING_MODEL", "claude-fable-5-2")
    assert llm_router.resolve_model("claude-opus") == ("anthropic", "claude-fable-5-2")
    assert llm_router.model_source("claude-opus") == "env NXT_AGENCY_REASONING_MODEL"
    stub_proxy["payload"] = {"seats": {"structured": "gpt-6.1-terra"}}  # a seat moved to another vendor
    seats.reset_cache()
    assert llm_router.resolve_model("claude-sonnet") == ("anthropic", seats.STRUCTURED_FALLBACK)


def test_seats_are_read_once_per_ttl(stub_proxy):
    for _ in range(5):
        llm_router.resolve_model("claude-opus")
        llm_router.resolve_model("gemini-pro")
    assert stub_proxy["fetches"] == 1


def test_unknown_key_still_errors():
    with pytest.raises(ValueError):
        llm_router.ModelRouter()._resolve("claude-3-opus")


def test_anthropic_bodies_carry_no_sampling_and_hold_computer_use():
    ap = pytest.importorskip("app.llm.anthropic_provider")
    for model in ("claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-sonnet-4-6"):
        assert ap._sampling_kwargs(model, 0.7) == {}
    computer = [{"type": "computer_20251124", "name": "computer", "display_width_px": 1280, "display_height_px": 800}]
    plain = [{"name": "get_weather", "parameters": {"type": "object", "properties": {}}}]
    assert ap._request_model("claude-opus-5-5", computer) == seats.COMPUTER_USE_FALLBACK
    assert ap._request_model("claude-sonnet-5-5", computer + plain) == seats.COMPUTER_USE_FALLBACK
    assert ap._request_model("claude-opus-5-5", plain) == "claude-opus-5-5"
    assert ap._request_model("claude-opus-5-5", None) == "claude-opus-5-5"


def test_openai_bodies_drop_temperature_and_reasoning_on_gpt6_tool_turns():
    op = pytest.importorskip("app.llm.openai_provider")
    tools = [{"type": "function", "function": {"name": "x", "parameters": {"type": "object", "properties": {}}}}]
    assert op._sampling_kwargs("gpt-6.1-terra", 0.7) == {}
    assert op._sampling_kwargs("gpt-5.5", 0.7) == {}
    assert op._sampling_kwargs("gpt-6.1-terra", 0.7, tools) == {"reasoning_effort": "none"}
    assert op._sampling_kwargs("gpt-5.5", 0.7, tools) == {}


def test_gemini_replays_the_thought_signature_and_answers_by_name():
    gp = pytest.importorskip("app.llm.gemini_provider")
    call_id = gp._new_call_id()

    class _Part:
        thought_signature = b"sig-bytes"

    gp._remember_signature(call_id, _Part())
    contents = gp._build_contents([
        {"role": "user", "content": "weather?"},
        {"role": "assistant", "content": [{"type": "tool_use", "id": call_id, "name": "get_weather", "input": {"city": "Paris"}}]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": call_id, "content": "Sunny"}]},
    ])
    call_part = contents[1].parts[0]
    assert call_part.function_call.name == "get_weather" and call_part.thought_signature == b"sig-bytes"
    assert contents[2].parts[0].function_response.name == "get_weather"
