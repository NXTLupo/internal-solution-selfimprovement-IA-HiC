#!/usr/bin/env python
"""Generate EXACT PPTX twins of the gold exemplars. Each gold HTML is rendered at
1920x1080 (2x device scale for print-crisp) via Playwright and placed full-bleed on a
single 16:9 PPTX slide (13.333 x 7.5in). Pixel-exact twin of the gold design.

This is the picture-exact tier. The editable-text hybrid (measured text runs + rasterized
SVG/tracks) is the follow-on enhancement; this tier guarantees the twin matches the gold
1:1 today. Run with the Playwright python (d:/tmp/pptx-test/venv). Usage:
gold_to_pptx.py [name ...]   (names without .html; default = all gold *.html)."""
import sys
import pathlib
import tempfile
from playwright.sync_api import sync_playwright
from pptx import Presentation
from pptx.util import Inches

GOLD = pathlib.Path(__file__).resolve().parents[2] / "hic-workspace/wiki/design-system/gold"
OUT = GOLD / "_pptx"
OUT.mkdir(exist_ok=True)
EMU_W, EMU_H = Inches(13.333), Inches(7.5)
names = sys.argv[1:] or [p.stem for p in sorted(GOLD.glob("*.html"))]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=2)
    made = 0
    for n in names:
        f = GOLD / f"{n}.html"
        if not f.exists():
            print(f"  MISSING {n}")
            continue
        pg.goto("file://" + str(f).replace("\\", "/"), wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(500)
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp.close()
        pg.screenshot(path=tmp.name, clip={"x": 0, "y": 0, "width": 1920, "height": 1080})
        prs = Presentation()
        prs.slide_width, prs.slide_height = EMU_W, EMU_H
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
        slide.shapes.add_picture(tmp.name, 0, 0, width=EMU_W, height=EMU_H)
        prs.save(str(OUT / f"{n}.pptx"))
        pathlib.Path(tmp.name).unlink(missing_ok=True)
        made += 1
        print(f"  twin {n}.pptx")
    b.close()
print(f"[done] {made} exact PPTX twins -> {OUT}")
