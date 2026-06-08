#!/usr/bin/env python
"""Render the .nxt-slide HTML twins to PPTX 1:1 via proxy/nxt_slide_export.py,
and screenshot every frame to PNG for visual QA. Run with a Playwright-capable
python (d:/tmp/pptx-test/venv)."""
import os, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "proxy"))
import nxt_slide_export as sx  # noqa

OUT = os.path.join(ROOT, "hic-workspace", "wiki", "eval", "exemplars")
FRAME_W, FRAME_H = 1280, 720

JOBS = [("journey-nu-slide.html", "journey-nu-slide.pptx", "slide"),
        ("journey-nu-slides.html", "journey-nu-slides.pptx", "slides")]


def screenshot(html, prefix):
    from playwright.sync_api import sync_playwright
    shot_css = ("<style>html,body{margin:0!important;padding:0!important;background:#fff}"
                ".nxt-slide{margin:0!important;box-shadow:none!important}</style>")
    doc = html.replace("</head>", shot_css + "</head>", 1)
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc); tmp.close()
    n = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
        pg = b.new_page(viewport={"width": FRAME_W, "height": FRAME_H}, device_scale_factor=1)
        pg.goto("file://" + tmp.name, wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(500)
        slides = pg.query_selector_all(".nxt-slide")
        for i, sl in enumerate(slides, 1):
            path = os.path.join(OUT, f"{prefix}-{i:02d}.png")
            sl.screenshot(path=path); n += 1
        b.close()
    os.unlink(tmp.name)
    return n


for html_name, pptx_name, prefix in JOBS:
    html = open(os.path.join(OUT, html_name), encoding="utf-8").read()
    frames = sx.parse_frames(html)
    res = sx.frames_to_pptx(frames, os.path.join(OUT, pptx_name), html=html)
    shots = screenshot(html, prefix)
    print(f"{pptx_name}: mode={res.get('mode')} slides={res.get('slides')} text_boxes={res.get('text_boxes')} | screenshots={shots}")
