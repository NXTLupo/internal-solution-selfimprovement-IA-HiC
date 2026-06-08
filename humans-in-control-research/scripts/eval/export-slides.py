#!/usr/bin/env python
"""Generic: render <name>.html twins in the exemplars dir to PPTX 1:1 via
proxy/nxt_slide_export.py and screenshot every frame. Run with the Playwright
python (d:/tmp/pptx-test/venv). Usage: export-slides.py base1 base2 ...
A base 'foo' renders foo.html -> foo.pptx (+ foo-NN.png screenshots)."""
import os, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "proxy"))
import nxt_slide_export as sx  # noqa

OUT = os.path.join(ROOT, "hic-workspace", "wiki", "eval", "exemplars")
FRAME_W, FRAME_H = 1280, 720
bases = sys.argv[1:] or ["journey-nu-slide", "journey-nu-slides"]


def screenshot(html, prefix):
    from playwright.sync_api import sync_playwright
    shot = ("<style>html,body{margin:0!important;padding:0!important;background:#fff}"
            ".nxt-slide{margin:0!important;box-shadow:none!important}</style>")
    doc = html.replace("</head>", shot + "</head>", 1)
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc); tmp.close()
    n = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
        pg = b.new_page(viewport={"width": FRAME_W, "height": FRAME_H}, device_scale_factor=1)
        pg.goto("file://" + tmp.name, wait_until="networkidle", timeout=30000)
        pg.wait_for_timeout(450)
        for i, sl in enumerate(pg.query_selector_all(".nxt-slide"), 1):
            sl.screenshot(path=os.path.join(OUT, f"{prefix}-{i:02d}.png")); n += 1
        b.close()
    os.unlink(tmp.name)
    return n


for base in bases:
    html = open(os.path.join(OUT, base + ".html"), encoding="utf-8").read()
    res = sx.frames_to_pptx(sx.parse_frames(html), os.path.join(OUT, base + ".pptx"), html=html)
    shots = screenshot(html, base)
    print(f"{base}.pptx: mode={res.get('mode')} slides={res.get('slides')} text_boxes={res.get('text_boxes')} | shots={shots}")
