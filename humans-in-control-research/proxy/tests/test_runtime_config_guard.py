"""2026-10-31: importing or testing the proxy never rewrites the live runtime config, and an empty token is never
published (that sequence left the running workers and every client holding different tokens)."""
from __future__ import annotations

import json
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


def test_the_suite_runs_against_its_own_runtime_dir(app_mod):
    base = app_mod._runtime_base_dir()
    assert base == os.environ["HIC_RUNTIME_BASE"]
    assert "hic-proxy-test-runtime-" in base


def test_an_empty_token_is_never_published(app_mod, tmp_path, monkeypatch):
    monkeypatch.setenv("HIC_RUNTIME_BASE", str(tmp_path))
    cfg = tmp_path / ".runtime" / "config.json"
    cfg.parent.mkdir()
    cfg.write_text(json.dumps({"proxyBase": "http://127.0.0.1:5012", "proxyToken": "x" * 43}), encoding="utf-8")
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "")
    app_mod._write_runtime_config()
    assert json.loads(cfg.read_text(encoding="utf-8"))["proxyToken"] == "x" * 43
    monkeypatch.setattr(app_mod, "_PROXY_AUTH_TOKEN", "y" * 43)
    app_mod._write_runtime_config()
    assert json.loads(cfg.read_text(encoding="utf-8"))["proxyToken"] == "y" * 43
