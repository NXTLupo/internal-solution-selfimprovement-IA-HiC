"""TTS provider fallback (closeout plan WS-B3, 2026-11-09).

`#audio-overview` degraded to a transcript because ElevenLabs answered 401. The key was never bad:
it authenticates, and the account is simply out of characters on the free tier, which ElevenLabs
reports as 401 on the TTS endpoint. Rather than park the capability behind a billing decision, a
spent quota now falls back to OpenAI speech. These tests read the handler's source, because app.py
cannot be imported offline (feedparser and other service deps are absent here), which is the same
approach test_deciem_brand.py already uses for app-level helpers.
"""
import ast
import os
import re

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, "app.py"), encoding="utf-8").read()


def _func(name: str) -> str:
    tree = ast.parse(SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(SRC, node) or ""
    raise AssertionError(f"{name} not found in app.py")


class TestFallbackExists:
    def test_the_fallback_renderer_is_defined(self):
        assert "_openai_speak_turns" in SRC

    def test_an_exhaustion_sentinel_distinguishes_quota_from_a_crash(self):
        assert "class _TtsExhausted" in SRC

    def test_the_fallback_uses_the_key_that_is_already_configured(self):
        fn = _func("_openai_speak_turns")
        assert 'os.environ.get("OPENAI_API_KEY"' in fn
        assert "api.openai.com/v1/audio/speech" in fn

    def test_two_voices_keep_the_two_speaker_shape(self):
        fn = _func("_openai_speak_turns")
        assert "_OPENAI_TTS_VOICE_A" in fn and "_OPENAI_TTS_VOICE_B" in fn
        assert "speaker" in fn

    def test_voices_are_overridable_by_environment(self):
        assert 'os.environ.get("OPENAI_TTS_VOICE_A"' in SRC
        assert 'os.environ.get("OPENAI_TTS_VOICE_B"' in SRC


class TestHandlerRoutesToFallback:
    def test_a_missing_elevenlabs_key_is_no_longer_fatal_on_its_own(self):
        fn = _func("tts_dialogue")
        assert "no TTS provider is configured" in fn
        assert "ELEVENLABS_API_KEY is not configured" not in fn

    def test_every_refusal_path_raises_the_sentinel_instead_of_returning_502(self):
        fn = _func("tts_dialogue")
        assert fn.count("_TtsExhausted(") >= 2
        assert "ElevenLabs refused (" in fn

    def test_the_handler_renders_with_the_fallback_before_giving_up(self):
        fn = _func("tts_dialogue")
        assert "_openai_speak_turns(turns)" in fn
        body = fn[fn.index("except (_TtsExhausted"):]
        assert "status_code=502" in body          # only after the fallback also fails
        assert body.index("_openai_speak_turns") < body.index("status_code=502")

    def test_a_fallback_render_declares_the_provider_and_the_degrade(self):
        fn = _func("tts_dialogue")
        assert '"provider": "openai"' in fn
        assert '"degraded"' in fn

    def test_a_primary_render_declares_its_provider_too(self):
        fn = _func("tts_dialogue")
        assert '"provider": "elevenlabs"' in fn

    def test_total_failure_names_both_providers_so_the_cause_is_diagnosable(self):
        fn = _func("tts_dialogue")
        assert "every TTS provider refused" in fn
        assert "primary:" in fn and "fallback:" in fn

    def test_the_turn_character_cap_still_applies_to_the_fallback(self):
        assert "_TTS_MAX_TURN_CHARS" in _func("_openai_speak_turns")

    def test_no_api_key_is_ever_logged(self):
        for fn in (_func("tts_dialogue"), _func("_openai_speak_turns")):
            for line in fn.splitlines():
                if "logger." in line:
                    assert "API_KEY" not in line and "key" not in line.lower().split("logger.")[1]


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
