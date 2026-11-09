"""Browser-free, fidelity-matched export of NXT slide-mode artifacts.

A slide-mode artifact is a sequence of fixed 16:9 .nxt-slide frames built from a
constrained design-system template vocabulary (see nxt-artifact-system.css and the
slide-mode contracts in app.py / dynamic_journey_mapper.py). Because the templates
are fixed and known, each frame can be rendered DETERMINISTICALLY to three formats
from ONE shared frame model + geometry, with NO headless browser:

  - PPTX : python-pptx, one EDITABLE slide per frame (real text boxes, never images).
  - PNG  : Pillow, drawing the same geometry + brand fonts.
  - PDF  : the PNG frames combined via PIL save_all (pixel-identical to the PNGs).

All three share parse_frames() + the geometry constants below, so they are mutually
consistent and consistent with the CSS preview (same template). Verified against
Playwright screenshots of the live HTML during development.

The PPTX path is the contractual one (text MUST stay editable). PNG/PDF are visual.
"""
from __future__ import annotations

import html as _html
from render_sandbox import sandboxed_page  # WS-0 S3 (2026-10-30): network-sandboxed renders
import os
import re
from html.parser import HTMLParser

# ---- brand tokens (mirror nxt-artifact-system.css) -------------------------
INK = "141414"
PAPER = "FAFAFA"
WHITE = "FFFFFF"
TEAL = "115054"
LIME = "CACA20"
MID = "3A3A3A"
MUTED = "5A5A52"
LINE = "EAEAEA"

# Frame geometry. CSS frame is 1280x720 (16:9), padding 64px.
FRAME_W = 1280
FRAME_H = 720
PAD = 64
PNG_SCALE = 2  # render PNG at 2x for crisp text, then it downsamples cleanly

_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "static")
FONTS = {
    "display": os.path.join(_FONT_DIR, "SairaCondensed-SemiBold.ttf"),
    "display_bold": os.path.join(_FONT_DIR, "SairaCondensed-Bold.ttf"),
    "body": os.path.join(_FONT_DIR, "Archivo-Regular.ttf"),
    "body_light": os.path.join(_FONT_DIR, "Archivo-Light.ttf"),
    "body_bold": os.path.join(_FONT_DIR, "Archivo-Bold.ttf"),
    "mono": os.path.join(_FONT_DIR, "JetBrainsMono-Regular.ttf"),
}


# ============================================================================
# PARSE  —  HTML  ->  frame model  (stdlib only, no bs4)
# ============================================================================
def _has_slide_cls(cls: str) -> bool:
    # match the frame container .nxt-slide but NOT its children (.nxt-slide__title etc.)
    return bool(re.search(r"(^|\s)nxt-slide(\s|$)", cls or ""))


class _FrameSplitter(HTMLParser):
    """Collect the inner HTML of every top-level element (any tag: section/div/...)
    whose class list contains the frame token `nxt-slide` (not a __child)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.frames = []          # list of (class_attr, inner_html)
        self._depth = 0           # nesting depth of the capture tag inside a frame
        self._tag = None          # the tag that opened the current frame
        self._buf = []
        self._cls = None
        self._capturing = False

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        cls = ad.get("class", "")
        if not self._capturing and _has_slide_cls(cls):
            self._capturing = True
            self._tag = tag
            self._cls = cls
            self._depth = 1
            self._buf = []
            return
        if self._capturing:
            if tag == self._tag:
                self._depth += 1
            self._buf.append(self.get_starttag_text())

    def handle_startendtag(self, tag, attrs):
        if self._capturing:
            self._buf.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if not self._capturing:
            return
        if tag == self._tag:
            self._depth -= 1
            if self._depth == 0:
                self.frames.append((self._cls, "".join(self._buf)))
                self._capturing = False
                self._tag = None
                self._cls = None
                return
        self._buf.append(f"</{tag}>")

    def handle_data(self, data):
        if self._capturing:
            self._buf.append(data)


def _enforcement_style() -> str:
    """The serve-time grid/repair CSS (collapse-safe grids, persona pinning, meter
    misuse, quote fill). Injected into the export render so the PPTX/PDF/PNG measure
    the SAME corrected layout the user sees in the live preview (export == preview).
    The page-width/margin rules are inert for fixed 1280x720 slides; the component
    collapse-guards are what matter for slide-content fidelity."""
    try:
        import nxt_design_system as _nds
        return "<style id='nxt-export-enforce'>" + _nds._NXT_GRID_CSS_BODY + "</style>"
    except Exception:
        return ""


def _strip_tags(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = _html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


class _ClassExtractor(HTMLParser):
    """Depth-aware: returns inner HTML of every element whose class list contains
    `cls`. Handles nested same-tag elements (which a regex backreference cannot)."""

    def __init__(self, cls):
        super().__init__(convert_charrefs=True)
        self._cls = cls
        self.results = []
        self._stack = []   # active captures: [(tag, depth, buf), ...]

    def _tok(self, cls_attr):
        return bool(re.search(r"(^|\s)" + re.escape(self._cls) + r"(\s|$)", cls_attr or ""))

    def handle_starttag(self, tag, attrs):
        text = self.get_starttag_text()
        for cap in self._stack:
            if cap[0] == tag:
                cap[1] += 1
            cap[2].append(text)
        ad = dict(attrs)
        if self._tok(ad.get("class", "")):
            self._stack.append([tag, 1, []])

    def handle_startendtag(self, tag, attrs):
        text = self.get_starttag_text()
        for cap in self._stack:
            cap[2].append(text)

    def handle_endtag(self, tag):
        for cap in self._stack:
            cap[2].append(f"</{tag}>")
        for i in range(len(self._stack) - 1, -1, -1):
            tg, depth, buf = self._stack[i]
            if tg == tag:
                depth -= 1
                if depth == 0:
                    # remove the trailing </tag> we just appended to THIS capture
                    if buf and buf[-1] == f"</{tag}>":
                        buf.pop()
                    self.results.append("".join(buf))
                    self._stack.pop(i)
                    break
                else:
                    self._stack[i][1] = depth

    def handle_data(self, data):
        for cap in self._stack:
            cap[2].append(data)


def _find_all(inner: str, cls: str):
    """Return inner HTML of every element carrying class `cls` (nesting-aware)."""
    ex = _ClassExtractor(cls)
    try:
        ex.feed(inner)
    except Exception:
        return []
    return ex.results


def _first(inner: str, cls: str) -> str:
    got = _find_all(inner, cls)
    return got[0] if got else ""


def _variant(cls: str) -> str:
    for v in ("title", "divider", "closing", "quote", "image", "split"):
        if f"nxt-slide--{v}" in cls:
            return v
    return "content"


def parse_frames(html: str) -> list[dict]:
    """Parse a slide-mode artifact HTML into a list of frame models."""
    sp = _FrameSplitter()
    sp.feed(html)
    frames = []
    for cls, inner in sp.frames:
        kicker = _strip_tags(_first(inner, "nxt-slide__kicker"))
        title = _strip_tags(_first(inner, "nxt-slide__title"))
        body = _strip_tags(_first(inner, "nxt-slide__body"))
        # structured blocks
        numlist = [_strip_tags(x) for x in _find_all(inner, "nxt-numlist__item")]
        cards = []
        for c in _find_all(inner, "nxt-card"):
            cards.append({
                "label": _strip_tags(_first(c, "nxt-card__label")),
                "title": _strip_tags(_first(c, "nxt-card__title")),
                "body": _strip_tags(_first(c, "nxt-card__body")),
            })
        quote_t = _strip_tags(_first(inner, "nxt-quote__text"))
        quote_c = _strip_tags(_first(inner, "nxt-quote__cite"))
        iconstats = []
        for s in _find_all(inner, "nxt-iconstat"):
            iconstats.append({
                "fig": _strip_tags(_first(s, "nxt-iconstat__fig")),
                "label": _strip_tags(_first(s, "nxt-iconstat__label")),
            })
        # generic table rows (th/td)
        table = []
        for rowm in re.finditer(r"<tr[^>]*>(.*?)</tr>", inner, re.DOTALL):
            cells = [_strip_tags(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", rowm.group(1), re.DOTALL)]
            if cells:
                table.append(cells)
        frames.append({
            "variant": _variant(cls),
            "kicker": kicker, "title": title, "body": body,
            "numlist": numlist, "cards": cards,
            "quote": {"text": quote_t, "cite": quote_c} if quote_t else None,
            "iconstats": iconstats, "table": table,
        })
    return frames


# ============================================================================
# MEASURE  —  headless Chromium DOM geometry for pixel-accurate editable PPTX
# ============================================================================
# The legacy template-offset PPTX path (frames_to_pptx_legacy below) reconstructs
# each frame at hardcoded y-offsets, so a wrapping title overlaps the body and any
# template outside its fixed field-set renders blank. This measures the REAL
# rendered geometry of every text node + box per .nxt-slide and lets the PPTX
# place editable text boxes at those exact coordinates — pixel-accurate AND
# editable, GENERIC over every template (new templates need no exporter code),
# and brand-agnostic (reads computed colors, so NU works through the same path).
_MEASURE_JS = r"""
() => {
  const slides = Array.from(document.querySelectorAll('.nxt-slide'));
  const toHex = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s.trim()));
    if (p.length >= 4 && p[3] === 0) return null; // transparent
    const h = (n) => ('0' + Math.round(n).toString(16)).slice(-2);
    return (h(p[0]) + h(p[1]) + h(p[2])).toUpperCase();
  };
  const hasText = (el) => {
    // leaf-ish: has non-empty direct text and no child ELEMENT that itself holds text
    const direct = Array.from(el.childNodes).filter(n => n.nodeType === 3)
      .map(n => n.textContent).join('').trim();
    if (!direct) return false;
    return true;
  };
  return slides.map(slide => {
    const sr = slide.getBoundingClientRect();
    const runs = [];
    const boxes = [];
    const walk = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // box: visible border or a fill distinct from white/transparent
      const bw = parseFloat(cs.borderTopWidth) || 0;
      const bg = toHex(cs.backgroundColor);
      const bc = toHex(cs.borderTopColor);
      if ((bw >= 1 && bc) || (bg && bg !== 'FFFFFF')) {
        if (r.width > 4 && r.height > 4) {
          boxes.push({ x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height,
            fill: bg, border: (bw >= 1 ? bc : null), bw, radius: parseFloat(cs.borderTopLeftRadius) || 0 });
        }
      }
      // text leaf
      const kids = Array.from(el.children);
      const elemKidsWithText = kids.filter(k => k.innerText && k.innerText.trim());
      if (hasText(el) && elemKidsWithText.length === 0 && el.innerText && el.innerText.trim()) {
        runs.push({
          text: el.innerText.trim(),
          x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height,
          size: parseFloat(cs.fontSize) || 16,
          weight: parseInt(cs.fontWeight) || 400,
          color: toHex(cs.color) || '141414',
          align: cs.textAlign || 'left',
          transform: cs.textTransform || 'none',
          family: (cs.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim(),
          spacing: cs.letterSpacing,
          lh: parseFloat(cs.lineHeight) || 0,
        });
      }
      kids.forEach(walk);
    };
    walk(slide);
    return { bg: toHex(getComputedStyle(slide).backgroundColor) || 'FFFFFF', w: sr.width, h: sr.height, runs, boxes };
  });
}
"""


def measure_frames_playwright(html: str):
    """Return per-frame {bg, runs[], boxes[]} measured from the rendered DOM, or
    None if Playwright/Chromium unavailable. runs/boxes coords are CSS px relative
    to each .nxt-slide (0..1280 x 0..720)."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None
    import tempfile, json as _json
    shot_css = (_enforcement_style() +
                "<style id='nxt-meas'>html,body{margin:0!important;padding:0!important;background:#fff}"
                ".nxt-masthead,.nxt-tabs{display:none!important}"
                ".nxt-slide{margin:0!important;box-shadow:none!important}</style>")
    doc = html.replace("</head>", shot_css + "</head>", 1) if "</head>" in html else shot_css + html
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc); tmp.close()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            page = sandboxed_page(browser, viewport={"width": FRAME_W, "height": FRAME_H}, device_scale_factor=1)
            page.goto("file://" + tmp.name, wait_until="networkidle", timeout=30000)
            try:
                page.wait_for_timeout(400)
            except Exception:
                pass
            data = page.evaluate(_MEASURE_JS)
            browser.close()
            return data or None
    except Exception:
        return None
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


# ============================================================================
# PPTX  —  editable, one slide per frame
# ============================================================================
def frames_to_pptx(frames: list[dict], out_path: str, html: str | None = None) -> dict:
    """Pixel-accurate + editable PPTX. When `html` is given and Chromium can
    measure it, build each slide from the MEASURED DOM geometry (every text node
    becomes an editable text box at its exact rendered position; boxes become
    rectangle shapes). Falls back to the legacy template-offset exporter when
    measurement is unavailable. Either way: real text, zero pictures."""
    if html:
        try:
            measured = measure_frames_playwright(html)
        except Exception:
            measured = None
        if measured:
            try:
                return _frames_to_pptx_measured(measured, out_path)
            except Exception:
                pass  # fall through to legacy
    return _frames_to_pptx_legacy(frames, out_path)


def _frames_to_pptx_measured(measured: list[dict], out_path: str) -> dict:
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.oxml.ns import qn

    EMU = 914400
    def inx(px): return Emu(int(px / FRAME_W * 13.333 * EMU))
    def iny(px): return Emu(int(px / FRAME_H * 7.5 * EMU))
    def rgb(h):
        try: return RGBColor.from_string((h or "141414").lstrip("#"))
        except Exception: return RGBColor.from_string("141414")
    ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "justify": PP_ALIGN.JUSTIFY}
    # Map measured font-family to an embeddable brand font name.
    def font_name(fam):
        f = (fam or "").lower()
        if "saira" in f or "bebas" in f: return "Saira Condensed"
        if "jetbrains" in f or "mono" in f: return "JetBrains Mono"
        if "spectral" in f or "georgia" in f or "serif" in f: return "Spectral"
        if "roboto" in f: return "Roboto"
        return "Archivo"

    prs = Presentation()
    prs.slide_width = Emu(int(13.333 * EMU))
    prs.slide_height = Emu(int(7.5 * EMU))
    blank = prs.slide_layouts[6]
    n_text = 0
    for fr in measured:
        slide = prs.slides.add_slide(blank)
        slide.background.fill.solid()
        slide.background.fill.fore_color.rgb = rgb(fr.get("bg") or "FFFFFF")
        # boxes first (behind text)
        for b in fr.get("boxes", []):
            try:
                shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if (b.get("radius") or 0) >= 4 else MSO_SHAPE.RECTANGLE,
                                             inx(b["x"]), iny(b["y"]), inx(b["w"]), iny(b["h"]))
                shp.shadow.inherit = False
                if b.get("fill"):
                    shp.fill.solid(); shp.fill.fore_color.rgb = rgb(b["fill"])
                else:
                    shp.fill.background()
                if b.get("border"):
                    shp.line.color.rgb = rgb(b["border"]); shp.line.width = Pt(max(0.75, b.get("bw", 1) * 0.75))
                else:
                    shp.line.fill.background()
            except Exception:
                pass
        # text runs
        for r in fr.get("runs", []):
            txt = r.get("text") or ""
            if not txt.strip():
                continue
            # pad height a touch so descenders aren't clipped; anchor top.
            tb = slide.shapes.add_textbox(inx(r["x"]), iny(r["y"]), inx(max(r["w"], 8)), iny(max(r["h"], 12)))
            tf = tb.text_frame
            # A single token (no spaces) must never break mid-word: PowerPoint's font
            # metrics run marginally wider than the browser-measured box, which would
            # otherwise split a one-word label like "FRUSTRATED" into "FRUSTRATE"+"D".
            tf.word_wrap = (" " in txt.strip())
            tf.vertical_anchor = MSO_ANCHOR.TOP
            for m in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
                setattr(tf, m, 0)
            p = tf.paragraphs[0]
            p.alignment = ALIGN.get(r.get("align", "left"), PP_ALIGN.LEFT)
            run = p.add_run()
            run.text = txt.upper() if r.get("transform") == "uppercase" else txt
            run.font.name = font_name(r.get("family"))
            run.font.size = Pt(max(6, r.get("size", 16) * 72.0 / 96.0))  # px -> pt
            run.font.bold = (r.get("weight", 400) >= 600)
            run.font.color.rgb = rgb(r.get("color"))
            sp = r.get("spacing")
            if sp and sp not in ("normal",):
                try:
                    px = float(str(sp).replace("px", ""))
                    run._r.get_or_add_rPr().set("spc", str(int(px * 100)))
                except Exception:
                    pass
            n_text += 1
    prs.save(out_path)
    try:
        from pptx_export import embed_brand_fonts
        embed_brand_fonts(out_path)
    except Exception:
        pass
    return {"slides": len(measured), "text_boxes": n_text, "pictures": 0, "mode": "measured", "path": out_path}


def _frames_to_pptx_legacy(frames: list[dict], out_path: str) -> dict:
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

    EMU = 914400
    def inx(px): return Emu(int(px / FRAME_W * 13.333 * EMU))
    def iny(px): return Emu(int(px / FRAME_H * 7.5 * EMU))

    prs = Presentation()
    prs.slide_width = Emu(int(13.333 * EMU))
    prs.slide_height = Emu(int(7.5 * EMU))
    blank = prs.slide_layouts[6]

    def rgb(h): return RGBColor.from_string(h)

    def bg(slide, hexc):
        slide.background.fill.solid()
        slide.background.fill.fore_color.rgb = rgb(hexc)

    def textbox(slide, x, y, w, h, text, font, size, color, bold=False,
                align=PP_ALIGN.LEFT, spacing=None, upper=False, anchor=MSO_ANCHOR.TOP):
        tb = slide.shapes.add_textbox(inx(x), iny(y), inx(w), iny(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor
        p = tf.paragraphs[0]
        p.alignment = align
        r = p.add_run()
        r.text = (text or "").upper() if upper else (text or "")
        r.font.name = font
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = rgb(color)
        if spacing is not None:
            from pptx.oxml.ns import qn
            rPr = r._r.get_or_add_rPr()
            rPr.set("spc", str(int(spacing * 100)))
        return tb

    DISP, BODY = "Saira Condensed", "Archivo"
    n = 0
    for f in frames:
        slide = prs.slides.add_slide(blank)
        v = f["variant"]
        dark = v in ("title", "divider", "closing")
        bg(slide, INK if v in ("title", "closing") else TEAL if v == "divider" else WHITE)
        title_color = WHITE if dark else INK
        kicker_color = LIME if dark else TEAL
        body_color = "F0F0F0" if dark else MID

        y = PAD
        if f["kicker"]:
            textbox(slide, PAD, y, FRAME_W - 2 * PAD, 30, f["kicker"], "JetBrains Mono", 13,
                    kicker_color, upper=True, spacing=2.2)
            y += 40
        if f["title"]:
            textbox(slide, PAD, y, FRAME_W - 2 * PAD, 130, f["title"], BODY, 30 if dark else 30,
                    title_color, bold=False)
            y += 150
        if f["body"]:
            textbox(slide, PAD, y, FRAME_W - 2 * PAD, 120, f["body"], BODY, 17, body_color)
            y += 100

        # structured blocks (content frames)
        if f["quote"]:
            textbox(slide, PAD, max(y, 240), FRAME_W - 2 * PAD, 200,
                    '"' + f["quote"]["text"] + '"', BODY, 26, INK)
            if f["quote"]["cite"]:
                textbox(slide, PAD, 470, FRAME_W - 2 * PAD, 40, f["quote"]["cite"],
                        "JetBrains Mono", 12, TEAL, upper=True, spacing=1.5)
        if f["numlist"]:
            ny = y
            for i, item in enumerate(f["numlist"][:6], 1):
                textbox(slide, PAD, ny, 50, 40, f"{i:02d}", DISP, 24, TEAL, bold=True)
                textbox(slide, PAD + 56, ny, FRAME_W - 2 * PAD - 56, 50, item, BODY, 15, INK)
                ny += 54
        if f["cards"]:
            cs = f["cards"][:4]
            cw = (FRAME_W - 2 * PAD - (len(cs) - 1) * 20) / max(len(cs), 1)
            for i, c in enumerate(cs):
                cx = PAD + i * (cw + 20)
                # card border rect
                from pptx.enum.shapes import MSO_SHAPE
                rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, inx(cx), iny(y), inx(cw), iny(150))
                rect.fill.solid(); rect.fill.fore_color.rgb = rgb(WHITE)
                rect.line.color.rgb = rgb(LINE); rect.line.width = Pt(1)
                rect.shadow.inherit = False
                if c["label"]:
                    textbox(slide, cx + 16, y + 14, cw - 32, 24, c["label"], "JetBrains Mono", 10, TEAL, upper=True, spacing=1.5)
                if c["title"]:
                    textbox(slide, cx + 16, y + 40, cw - 32, 50, c["title"], BODY, 15, INK, bold=True)
                if c["body"]:
                    textbox(slide, cx + 16, y + 84, cw - 32, 56, c["body"], BODY, 12, MID)
        if f["iconstats"]:
            ss = f["iconstats"][:4]
            sw = (FRAME_W - 2 * PAD - (len(ss) - 1) * 20) / max(len(ss), 1)
            for i, s in enumerate(ss):
                sx = PAD + i * (sw + 20)
                textbox(slide, sx, y, sw, 60, s["fig"], DISP, 34, TEAL, bold=True)
                textbox(slide, sx, y + 56, sw, 40, s["label"], BODY, 13, MID)
        if f["table"]:
            ty = y
            rows = f["table"][:8]
            ncol = max((len(r) for r in rows), default=1)
            colw = (FRAME_W - 2 * PAD) / ncol
            for ri, row in enumerate(rows):
                for ci, cell in enumerate(row):
                    textbox(slide, PAD + ci * colw, ty, colw, 36, cell, BODY,
                            11 if ri else 11, INK, bold=(ri == 0))
                ty += 38

        # logo lockup (text wordmark; editable). Real raster wordmark added later if needed.
        textbox(slide, FRAME_W - 220, 30, 160, 30, "NXT HUMANS", DISP, 16,
                WHITE if dark else INK, bold=True, align=PP_ALIGN.RIGHT, spacing=0.5)
        n += 1

    prs.save(out_path)
    try:
        from pptx_export import embed_brand_fonts
        embed_brand_fonts(out_path)
    except Exception:
        pass
    return {"slides": n, "path": out_path}


# ============================================================================
# PNG / PDF  —  Pillow, same geometry
# ============================================================================
# Archivo-Light.ttf is the full variable font; instance it to the CSS weight so
# the PNG matches the airy preview (titles ExtraLight 200, body Light 300).
_VAR_WEIGHT = {"body_light": 200, "body": 400}


def _font(key: str, size: int):
    from PIL import ImageFont
    path = FONTS.get(key, FONTS["body"])
    try:
        f = ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()
    if key in _VAR_WEIGHT:
        try:
            f.set_variation_by_axes([_VAR_WEIGHT[key]])
        except Exception:
            pass  # not a variable font / axis unavailable
    return f


def _wrap(draw, text, font, max_w):
    words = (text or "").split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def frames_to_images(frames: list[dict]):
    from PIL import Image, ImageDraw
    S = PNG_SCALE
    imgs = []
    for f in frames:
        v = f["variant"]
        dark = v in ("title", "divider", "closing")
        bgc = "#" + (INK if v in ("title", "closing") else TEAL if v == "divider" else WHITE)
        img = Image.new("RGB", (FRAME_W * S, FRAME_H * S), bgc)
        d = ImageDraw.Draw(img)
        title_c = "#" + (WHITE if dark else INK)
        kick_c = "#" + (LIME if dark else TEAL)
        body_c = "#F0F0F0" if dark else "#" + MID
        x = PAD * S
        y = PAD * S
        if f["kicker"]:
            fo = _font("mono", 13 * S)
            d.text((x, y), f["kicker"].upper(), font=fo, fill=kick_c)
            y += 40 * S
        if f["title"]:
            fo = _font("body_light", 34 * S)
            for ln in _wrap(d, f["title"], fo, (FRAME_W - 2 * PAD) * S):
                d.text((x, y), ln, font=fo, fill=title_c); y += 42 * S
            y += 12 * S
        if f["body"]:
            fo = _font("body_light", 17 * S)
            for ln in _wrap(d, f["body"], fo, (FRAME_W - 2 * PAD) * S):
                d.text((x, y), ln, font=fo, fill=body_c); y += 26 * S
            y += 16 * S
        if f["quote"]:
            fo = _font("body", 26 * S)
            for ln in _wrap(d, '"' + f["quote"]["text"] + '"', fo, (FRAME_W - 2 * PAD) * S):
                d.text((x, y), ln, font=fo, fill="#" + INK); y += 34 * S
            if f["quote"]["cite"]:
                d.text((x, y + 8 * S), f["quote"]["cite"].upper(), font=_font("mono", 12 * S), fill="#" + TEAL)
        if f["numlist"]:
            for i, item in enumerate(f["numlist"][:6], 1):
                d.text((x, y), f"{i:02d}", font=_font("display_bold", 24 * S), fill="#" + TEAL)
                for ln in _wrap(d, item, _font("body", 15 * S), (FRAME_W - 2 * PAD - 56) * S):
                    d.text((x + 56 * S, y), ln, font=_font("body", 15 * S), fill="#" + INK); y += 24 * S
                y += 14 * S
        if f["cards"]:
            cs = f["cards"][:4]
            cw = ((FRAME_W - 2 * PAD - (len(cs) - 1) * 20) / max(len(cs), 1))
            for i, c in enumerate(cs):
                cx = (PAD + i * (cw + 20)) * S
                d.rectangle([cx, y, cx + cw * S, y + 150 * S], outline="#" + LINE, width=S, fill="#" + WHITE)
                if c["label"]:
                    d.text((cx + 16 * S, y + 14 * S), c["label"].upper(), font=_font("mono", 10 * S), fill="#" + TEAL)
                if c["title"]:
                    d.text((cx + 16 * S, y + 40 * S), c["title"], font=_font("body_bold", 15 * S), fill="#" + INK)
                if c["body"]:
                    yy = y + 84 * S
                    for ln in _wrap(d, c["body"], _font("body", 12 * S), (cw - 32) * S):
                        d.text((cx + 16 * S, yy), ln, font=_font("body", 12 * S), fill="#" + MID); yy += 16 * S
        if f["iconstats"]:
            ss = f["iconstats"][:4]
            sw = ((FRAME_W - 2 * PAD - (len(ss) - 1) * 20) / max(len(ss), 1))
            for i, s in enumerate(ss):
                sx = (PAD + i * (sw + 20)) * S
                d.text((sx, y), s["fig"], font=_font("display_bold", 34 * S), fill="#" + TEAL)
                d.text((sx, y + 56 * S), s["label"], font=_font("body", 13 * S), fill="#" + MID)
        # logo
        lf = _font("display_bold", 16 * S)
        lw = d.textlength("NXT HUMANS", font=lf)
        d.text((img.width - PAD * S - lw, PAD // 2 * S), "NXT HUMANS", font=lf,
               fill="#" + (WHITE if dark else INK))
        if S != 1:
            img = img.resize((FRAME_W, FRAME_H), Image.LANCZOS)
        imgs.append(img)
    return imgs


# ============================================================================
# TRUE-RENDER PNG/PDF via headless Chromium (Playwright) — 100%-reflective path
# ============================================================================
# Renders the ACTUAL .nxt-slide frames with the real design-system CSS, so every
# block (matrix, swimlane, donut, process, ...) appears exactly as in the preview
# with zero per-template reimplementation. The Pillow frames_to_images() above is
# the fallback when Chromium is unavailable.

def render_frames_playwright(html: str):
    """Render each .nxt-slide frame to PNG bytes with headless Chromium.
    Returns list[bytes], or None if Playwright/Chromium is unavailable."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None
    import tempfile
    shot_css = (_enforcement_style() +
                "<style id='nxt-shot'>html,body{margin:0!important;padding:0!important;background:#fff}"
                ".nxt-masthead,.nxt-tabs{position:static!important;display:none!important}"
                ".nxt-slide{margin:0!important;box-shadow:none!important}</style>")
    doc = html.replace("</head>", shot_css + "</head>", 1) if "</head>" in html else shot_css + html
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc); tmp.close()
    out = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            page = sandboxed_page(browser, viewport={"width": FRAME_W, "height": FRAME_H},
                                    device_scale_factor=2)
            page.goto("file://" + tmp.name, wait_until="networkidle", timeout=30000)
            try:
                page.wait_for_timeout(400)  # let webfonts settle
            except Exception:
                pass
            for h in page.query_selector_all(".nxt-slide"):
                try:
                    out.append(h.screenshot(type="png"))
                except Exception:
                    pass
            browser.close()
    except Exception:
        return None
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
    return out or None


def frames_to_png(frames, out_dir, html: str | None = None):
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    shots = render_frames_playwright(html) if html else None
    if shots:
        for i, b in enumerate(shots, 1):
            p = os.path.join(out_dir, f"slide-{i:02d}.png")
            with open(p, "wb") as f:
                f.write(b)
            paths.append(p)
        return paths
    for i, img in enumerate(frames_to_images(frames), 1):
        p = os.path.join(out_dir, f"slide-{i:02d}.png")
        img.save(p, "PNG")
        paths.append(p)
    return paths


def frames_to_pdf(frames, out_path, html: str | None = None):
    from PIL import Image
    import io
    shots = render_frames_playwright(html) if html else None
    if shots:
        imgs = [Image.open(io.BytesIO(b)).convert("RGB") for b in shots]
    else:
        imgs = frames_to_images(frames)
    if not imgs:
        return {"pages": 0}
    imgs[0].save(out_path, "PDF", save_all=True, append_images=imgs[1:], resolution=96.0)
    return {"pages": len(imgs), "path": out_path}
