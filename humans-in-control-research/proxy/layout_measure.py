"""Server-side layout measurement for the #slides layout gate (2026-10-26).

The SPA measured each composed slide in an offscreen iframe. In the owner's real session (1,000+ slide frames) that
frame never fired a load event ("frame attached, no load event in 6 s"), so the gate measured 0 of 8 slides on three
live runs. The measurement now runs here, in the same headless Chromium, with the same file:// load and font wait the
PPTX exporter uses (gold_pptx_export.py), so the gate sees exactly the layout the export will see.

MEASURE_JS mirrors services/layoutGate.ts::measureSlideDocument (keep the two in step).
"""
from __future__ import annotations

import os
from render_sandbox import sandboxed_page  # WS-0 S3 (2026-10-30): network-sandboxed renders
import re
import tempfile

W, H = 1920, 1080

MEASURE_JS = r"""(slideId) => {
  const W = 1920, H = 1080;
  const FRAGMENT_RE = /[(\[](?:Sources?):|[a-z0-9_./-]+\.md#c\d+|CHUNK_\d+|\[\[/i;
  const out = { slideId, offCanvas: 0, clipped: 0, overlaps: 0, fragments: 0, deadSpace: 0, details: [] };
  const isNumeral = (el, text) => { const cs = getComputedStyle(el); return text.length <= 4 && (/saira/i.test(cs.fontFamily) || parseFloat(cs.fontSize) >= 56); };
  const textEls = Array.from(document.querySelectorAll('body *')).filter((e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return Array.from(e.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0);
  });
  const boxes = textEls.map((e) => ({ e, r: e.getBoundingClientRect(), text: (e.textContent || '').trim().slice(0, 50) }));
  for (const b of boxes) {
    if (b.r.right > W + 2 || b.r.bottom > H + 2 || b.r.left < -2 || b.r.top < -2) { out.offCanvas++; out.details.push('off-canvas: "' + b.text + '"'); }
  }
  for (const b of boxes) {
    const cs = getComputedStyle(b.e);
    if (cs.overflow === 'hidden' && (b.e.scrollHeight > b.e.clientHeight + 6 || b.e.scrollWidth > b.e.clientWidth + 6)) { out.clipped++; out.details.push('clipped: "' + b.text + '"'); }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      if (isNumeral(a.e, a.text) || isNumeral(b.e, b.text)) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ix > 8 && iy > 8) { out.overlaps++; if (out.details.length < 12) out.details.push('overlap: "' + a.text + '" / "' + b.text + '"'); }
    }
  }
  // 2026-10-26 (live: a header picture covered "PROJECTED IMPACT" and a figure line, and the slide measured clean): a
  // picture over text is an overlap too. Full-bleed backdrops (over 40% of the canvas) sit under titles by design.
  // the rendered text lines, not the element box (a glyph inside a wide name box touches no letter)
  const lineRects = (e) => { try { const rg = document.createRange(); rg.selectNodeContents(e); return Array.from(rg.getClientRects()); } catch (_) { return [e.getBoundingClientRect()]; } };
  for (const im of Array.from(document.querySelectorAll('img'))) {
    const r = im.getBoundingClientRect();
    if (r.width * r.height < 400 || r.width * r.height > 0.4 * W * H) continue;
    for (const b of boxes) {
      if (isNumeral(b.e, b.text)) continue;
      const hit = lineRects(b.e).some((lr) => (Math.min(r.right, lr.right) - Math.max(r.left, lr.left)) > 12 && (Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top)) > 8);
      if (hit) { out.overlaps++; if (out.details.length < 12) out.details.push('image over text: "' + b.text + '"'); }
    }
  }
  // 2026-10-27 (run 43: the fourth line of a comparison cell sat on the row divider and the slide measured clean): a
  // hairline (a bare element at most 4 px tall and 60 px wide) crossing a text line's glyph band is an overlap.
  const rules = Array.from(document.querySelectorAll('body *')).filter((e) => {
    if (e.childElementCount || (e.textContent || '').trim()) return false;
    const r = e.getBoundingClientRect();
    return r.height > 0 && r.height <= 4 && r.width >= 60;
  }).map((e) => e.getBoundingClientRect());
  for (const r of rules) {
    const y = (r.top + r.bottom) / 2;
    for (const b of boxes) {
      if (isNumeral(b.e, b.text)) continue;   // a display numeral over its hairline is the design (run 45)
      const hit = lineRects(b.e).find((lr) => (Math.min(r.right, lr.right) - Math.max(r.left, lr.left)) > 12 && y > lr.top + 0.25 * lr.height && y < lr.bottom - 0.15 * lr.height);
      if (hit) { out.overlaps++; if (out.details.length < 12) out.details.push('rule through text: "' + b.text + '"'); break; }
    }
  }
  const bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
  if (FRAGMENT_RE.test(bodyText)) { out.fragments = (bodyText.match(/[(\[](?:Sources?):|\.md#c\d+|CHUNK_\d+/gi) || []).length || 1; out.details.push('leaked citation fragment'); }
  const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.getBoundingClientRect());
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (const r of [...boxes.map((b) => b.r), ...imgs]) { minX = Math.min(minX, r.left); minY = Math.min(minY, r.top); maxX = Math.max(maxX, r.right); maxY = Math.max(maxY, r.bottom); }
  const used = (boxes.length || imgs.length) ? ((maxX - minX) * (maxY - minY)) / (W * H) : 0;
  out.deadSpace = Math.max(0, Math.min(1, 1 - used));
  return out;
}"""

_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
_DATA_URI_RE = re.compile(r"data:image/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{200,}", re.I)


def _half_size(jpg: bytes) -> bytes:
    """960 px wide is enough to read a slide; the full 1920 frame is four times the bytes in a tool result."""
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(jpg)).convert("RGB")
        im.thumbnail((960, 540))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=70)
        return buf.getvalue()
    except Exception:
        return jpg


def lighten(html: str) -> str:
    """Inline images do not move text; a 1-pixel placeholder keeps every box and drops megabytes."""
    return _DATA_URI_RE.sub(_PIXEL, str(html or ""))


def measure_slides(slides: list, screenshot: bool = False) -> list:
    """[{id, html}] -> [defects | {"slideId", "error"}], one headless page per slide (the exporter's pattern).

    WS-4 L1 (2026-10-30): with `screenshot=True` each result also carries `screenshot` (base64 JPEG of the composed
    slide, 960 px wide) and `screenshotMime`, so the deck model and the slide critic can look at what was drawn.
    """
    import base64
    from playwright.sync_api import sync_playwright
    out = []
    tmp_paths = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            try:
                for s in slides:
                    sid = str(s.get("id") or "slide")
                    try:
                        tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
                        tmp.write(lighten(s.get("html") or ""))
                        tmp.close()
                        tmp_paths.append(tmp.name)
                        pg = sandboxed_page(browser, viewport={"width": W, "height": H})
                        pg.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
                        try:
                            pg.evaluate("async () => { await document.fonts.ready; }")
                        except Exception:
                            pass
                        pg.wait_for_timeout(300)
                        row = pg.evaluate(MEASURE_JS, sid)
                        if screenshot:
                            try:
                                jpg = pg.screenshot(type="jpeg", quality=60, scale="css", clip={"x": 0, "y": 0, "width": W, "height": H})
                                row["screenshot"] = base64.b64encode(_half_size(jpg)).decode("ascii")
                                row["screenshotMime"] = "image/jpeg"
                            except Exception as se:
                                row["screenshotError"] = str(se)[:120]
                        out.append(row)
                        pg.close()
                    except Exception as e:
                        out.append({"slideId": sid, "error": str(e)[:200]})
            finally:
                browser.close()
    finally:
        for t in tmp_paths:
            try:
                os.unlink(t)
            except Exception:
                pass
    return out
