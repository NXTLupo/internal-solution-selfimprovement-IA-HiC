"""Plan Part 8, P5: each prototype screen is screenshotted by the isolated renderer and looked at by the reviewer
from another vendor; a screen the navigation cannot reach is a design check. No network: httpx.post is replaced."""
import base64
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, prototype, providers, store  # noqa: E402

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
DIRECTION = {"screens": [{"name": "Overview"}, {"name": "Cohorts"}, {"name": "Campaigns"}]}


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


class R:
    def __init__(self, status, body):
        self.status_code, self._b = status, body

    def json(self):
        return self._b


def test_screens_are_shot_by_the_renderer_and_missing_ones_are_named(monkeypatch):
    sent = {}

    def fake_post(url, json=None, timeout=None, **kw):
        sent.update(url=url, body=json)
        return R(200, {"shots": [{"screen": "first view", "png": base64.b64encode(PNG).decode()},
                                 {"screen": "Overview", "png": base64.b64encode(PNG).decode()}], "unreachable": ["Cohorts", "Campaigns"]})
    monkeypatch.setattr(prototype.httpx, "post", fake_post)
    shots, unreachable = prototype.screenshots("<html><body>x</body></html>", DIRECTION)
    assert sent["url"].endswith("/shots") and sent["body"]["screens"] == ["Overview", "Cohorts", "Campaigns"]
    assert [n for n, _ in shots] == ["first view", "Overview"] and shots[0][1] == PNG and unreachable == ["Cohorts", "Campaigns"]


def test_renderer_down_means_a_source_only_review():
    assert prototype.screenshots("<html></html>", DIRECTION) is None          # conftest: the renderer is a closed port


def test_the_reviewer_sees_the_screenshots(monkeypatch):
    monkeypatch.setattr(config, "GEMINI_API_KEY", "k")
    seen = {}

    def fake_gemini(model, prompt, ledger, system=None, json_schema=None, max_output_tokens=0, images=None, **kw):
        seen.update(prompt=prompt, images=images)
        return '{"scores": {"concept": 4, "hierarchy": 3}, "must_fix": [{"where": "Overview", "problem": "clipped title", "fix": "wrap it"}]}', None, None
    monkeypatch.setattr(providers, "gemini_generate", fake_gemini)
    monkeypatch.setattr(prototype.verify, "judge_model_for", lambda m: "gemini-4-carbon")
    out = prototype.critique("<html></html>", DIRECTION, None, providers.Ledger(limit_usd=1), "claude-opus-5-5",
                             shots=[("first view", PNG), ("Overview", PNG)])
    assert seen["images"] == [("image/png", PNG), ("image/png", PNG)]
    assert "SCREENSHOTS follow the source" in seen["prompt"] and "first view; Overview" in seen["prompt"]
    assert out["looked_at"] == ["first view", "Overview"] and out["must_fix"][0]["fix"] == "wrap it"


def test_gemini_request_carries_images(monkeypatch):
    captured = {}

    class Resp:
        status_code = 200

        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": "{}"}]}}], "usageMetadata": {}}
    monkeypatch.setattr(providers.httpx, "post", lambda url, json=None, timeout=None, headers=None: (captured.update(body=json) or Resp()))
    providers.gemini_generate("gemini-4-carbon", "look", images=[("image/png", PNG)])
    parts = captured["body"]["contents"][0]["parts"]
    assert parts[0] == {"text": "look"} and parts[1]["inline_data"]["mime_type"] == "image/png"
    assert base64.b64decode(parts[1]["inline_data"]["data"]) == PNG
