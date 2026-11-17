"""PNG and PDF exports of #stage 1920x1080 slide HTML, rendered by Chromium (2026-11-16).

The SPA used to make PNG and PDF exports with html2canvas over an off-screen iframe. html2canvas measures each
word inside the iframe (where the brand web font, e.g. NU's Lato, is loaded) but paints on a canvas owned by the
parent page, where that font is not registered: words were painted in a wider fallback at the narrower positions
and collided ("DeterministicSQLownsevery..."), and letter-spaced labels split ("ARCHI TECTURE"). The owner's #arch
PNG and PDF of 2026-11-16 were unreadable.

Here the SAME stage HTML the PowerPoint export uses is opened in Chromium (the page that laid the text out is the
page that paints it, so the fonts always agree), in the same network sandbox as the PowerPoint exporter. PNG is a
2x screenshot of the 1920x1080 stage; PDF is Chromium's print of each stage at 1920x1080 CSS pixels, so its text
is real, selectable vector text rather than a picture.
"""
import io
import os
import tempfile

from render_sandbox import sandboxed_page

W, H = 1920, 1080
_RESET = "<style>@page{size:1920px 1080px;margin:0}html,body{margin:0!important;padding:0!important;width:1920px;height:1080px;overflow:hidden}</style>"


def _open(browser, html: str, scale: int, tmp_paths: list):
    doc = html.replace("</head>", _RESET + "</head>", 1) if "</head>" in html else _RESET + html
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc)
    tmp.close()
    tmp_paths.append(tmp.name)
    pg = sandboxed_page(browser, viewport={"width": W, "height": H}, device_scale_factor=scale)
    pg.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
    try:
        pg.evaluate("async () => { await document.fonts.ready; await Promise.all(Array.from(document.images)"
                    ".filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))); }")
    except Exception:
        pass
    pg.wait_for_timeout(300)
    return pg


def stages_to_png(stages: list) -> bytes:
    """The first stage as a 3840x2160 PNG."""
    from playwright.sync_api import sync_playwright
    tmp_paths: list = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            try:
                pg = _open(b, stages[0], 2, tmp_paths)
                return pg.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H}, type="png")
            finally:
                b.close()
    finally:
        for t in tmp_paths:
            try:
                os.unlink(t)
            except OSError:
                pass


def stages_to_pdf(stages: list) -> bytes:
    """Every stage as one 1920x1080 page of a single PDF, with vector text."""
    from playwright.sync_api import sync_playwright
    from PyPDF2 import PdfMerger
    tmp_paths: list = []
    parts = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            try:
                for html in stages:
                    pg = _open(b, html, 1, tmp_paths)
                    pg.emulate_media(media="screen")   # print exactly what the screen shows
                    parts.append(pg.pdf(width=f"{W}px", height=f"{H}px", print_background=True,
                                        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}, page_ranges="1"))
                    pg.close()
            finally:
                b.close()
    finally:
        for t in tmp_paths:
            try:
                os.unlink(t)
            except OSError:
                pass
    if len(parts) == 1:
        return parts[0]
    merger = PdfMerger()
    for part in parts:
        merger.append(io.BytesIO(part))
    out = io.BytesIO()
    merger.write(out)
    merger.close()
    return out.getvalue()
