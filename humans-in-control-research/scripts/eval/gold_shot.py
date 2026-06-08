#!/usr/bin/env python
"""Screenshot gold exemplar HTML files at 1920x1080 via Playwright. Usage:
gold_shot.py blueprint-nxt personas-nxt ...  (names without .html). Output PNGs to
gold/_shots/. Run with the Playwright python (d:/tmp/pptx-test/venv)."""
import sys
import pathlib
from playwright.sync_api import sync_playwright

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"
SHOTS = GOLD / "_shots"
SHOTS.mkdir(exist_ok=True)
names = sys.argv[1:] or [p.stem for p in sorted(GOLD.glob("*.html"))]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    for n in names:
        f = GOLD / f"{n}.html"
        if not f.exists():
            print(f"  MISSING {n}")
            continue
        pg.goto("file://" + str(f).replace("\\", "/"), wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(SHOTS / f"{n}.png"))
        print(f"  shot {n}")
    b.close()
print("[done]")
