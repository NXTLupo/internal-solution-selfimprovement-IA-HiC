"""WS-E E1 (2026-10-31): the recorded-audio dictation fallback hands the clip to the Video Transcription service and
returns plain text; the service is stubbed (no network, no provider call)."""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="module")
def app_mod():
    pytest.importorskip("fastapi")
    os.environ.setdefault("PROXY_AUTH_DISABLED", "1")
    os.environ["HIC_MEMORY_LIFECYCLE"] = "0"
    os.environ["HIC_BRAIN_GROWTH"] = "0"
    import importlib
    return importlib.import_module("app")


class _Resp:
    def __init__(self, status, payload):
        self.status_code, self._p = status, payload

    def json(self):
        return self._p


def _fake_client(calls, job_status="completed", transcript=None):
    class _C:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, files=None, **k):
            calls.append(("POST", url, files["file"][0], len(files["file"][1])))
            return _Resp(200, {"job_id": "j1", "status": "processing"})

        async def get(self, url, **k):
            calls.append(("GET", url))
            if url.endswith("/jobs/j1"):
                return _Resp(200, {"status": job_status})
            return _Resp(200, transcript or {"transcript": "Lead with the CIO view.\n\n[00:00 - 00:03] Lead with the CIO view.",
                                              "transcription": {"full_text": "Lead with the CIO view."}})
    return _C


@pytest.fixture()
def client(app_mod, monkeypatch):
    from fastapi.testclient import TestClient
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")

    async def _no_sleep(_s):
        return None
    monkeypatch.setattr(app_mod.asyncio, "sleep", _no_sleep)
    return TestClient(app_mod.app)


def test_a_clip_comes_back_as_text(app_mod, client, monkeypatch):
    calls = []
    monkeypatch.setattr(app_mod.httpx, "AsyncClient", _fake_client(calls))
    r = client.post("/api/transcribe/dictation?ext=webm", content=b"\x1aE\xdf\xa3audio", headers={"Content-Type": "audio/webm"})
    assert r.status_code == 200, r.text
    assert r.json()["text"] == "Lead with the CIO view."
    assert calls[0][:3] == ("POST", f"{app_mod.VIDEO_ANALYZER_URL}/upload-video", "dictation.webm")


def test_the_text_file_is_the_fallback_and_whitespace_is_flattened(app_mod):
    assert app_mod._dictation_text({"transcript": "Drop slide four\n and keep the cover.\n\n[00:00] Drop slide four"}) == "Drop slide four and keep the cover."


def test_failures_are_reported_not_invented(app_mod, client, monkeypatch):
    monkeypatch.setattr(app_mod.httpx, "AsyncClient", _fake_client([], job_status="failed"))
    r = client.post("/api/transcribe/dictation", content=b"audio", headers={"Content-Type": "audio/webm"})
    assert r.status_code == 502 and "failed" in r.json()["error"]
    assert client.post("/api/transcribe/dictation", content=b"").status_code == 400
