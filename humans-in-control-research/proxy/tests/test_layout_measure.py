"""Layout gate measurement in the proxy's Chromium (2026-10-26). Needs Playwright + Chromium (the proxy container has
both); skipped elsewhere. A clean slide measures clean; planted collisions, clipping and off-canvas text are caught."""
from __future__ import annotations

import os
import sys

import pytest

pytest.importorskip("playwright")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import layout_measure as lm  # noqa: E402

BASE = "<!doctype html><html><head><style>body{margin:0;width:1920px;height:1080px;position:relative;font:28px Arial}</style></head><body>{}</body></html>"


def _slide(body: str) -> str:
    return BASE.replace("{}", body)


def test_clean_overlap_clip_and_off_canvas():
    clean = _slide('<div style="position:absolute;left:100px;top:100px;width:800px">A clean title</div>'
                   '<div style="position:absolute;left:100px;top:300px;width:800px">A clean body sentence.</div>')
    overlap = _slide('<div style="position:absolute;left:100px;top:100px;width:800px">First text box here</div>'
                     '<div style="position:absolute;left:120px;top:110px;width:800px">Second text box collides</div>')
    clipped = _slide('<div style="position:absolute;left:100px;top:100px;width:300px;height:40px;overflow:hidden">'
                     + "A long paragraph that cannot fit inside forty pixels of height. " * 6 + "</div>")
    off = _slide('<div style="position:absolute;left:1800px;top:100px;width:400px">Runs past the right edge</div>')
    pic = 'data:image/png;base64,' + 'A' * 5000
    res = {r["slideId"]: r for r in lm.measure_slides([
        {"id": "clean", "html": clean.replace("</body>", f'<img src="{pic}" style="position:absolute;left:1200px;top:200px;width:400px;height:300px"></body>')},
        {"id": "overlap", "html": overlap}, {"id": "clipped", "html": clipped}, {"id": "off", "html": off}])}
    assert res["clean"]["overlaps"] == 0 and res["clean"]["clipped"] == 0 and res["clean"]["offCanvas"] == 0
    assert res["overlap"]["overlaps"] >= 1
    assert res["clipped"]["clipped"] >= 1
    assert res["off"]["offCanvas"] >= 1


def test_screenshot_rides_with_the_measurement_when_asked():
    """WS-4 L1 (2026-10-30): render_slide needs the picture of the composed slide, not only the numbers."""
    import base64
    html = _slide('<div style="position:absolute;left:100px;top:100px;width:800px">A clean title</div>')
    plain = lm.measure_slides([{"id": "s", "html": html}])[0]
    assert "screenshot" not in plain
    shot = lm.measure_slides([{"id": "s", "html": html}], screenshot=True)[0]
    assert shot.get("screenshotMime") == "image/jpeg"
    raw = base64.b64decode(shot["screenshot"])
    assert raw[:3] == b"\xff\xd8\xff" and 1_000 < len(raw) < 400_000


def test_lighten_keeps_the_image_box_and_drops_the_bytes():
    html = '<img src="data:image/jpeg;base64,' + "B" * 9000 + '" style="width:400px;height:300px">'
    light = lm.lighten(html)
    assert len(light) < 300 and 'style="width:400px;height:300px"' in light
