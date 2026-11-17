"""Shared test guard: no test ever reaches the live HiC proxy (its wiki is the shared second brain; a test write there
would pollute real work). HiC is pointed at a closed local port; tests that exercise the link mock hic._call."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, hic  # noqa: E402


@pytest.fixture(autouse=True)
def _no_live_hic(monkeypatch, tmp_path):
    monkeypatch.setattr(hic, "HIC_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(hic, "RUNTIME_CONFIG", str(tmp_path / "no-hic-config.json"))
    monkeypatch.setattr(config, "RENDER_URL", "http://127.0.0.1:9")       # nor the prototype renderer
