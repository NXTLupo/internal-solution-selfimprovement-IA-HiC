#!/usr/bin/env python
"""HYBRID editable-text PPTX twins of the gold exemplars (#3 of the unification goal).
Reconstructive hybrid (the approved option): native EDITABLE text runs + native shape
boxes (rail, cells, dots, takeaway, accent borders) + ONLY the SVG (emotion curve)
rasterized as an image. Gold fonts (Lora / IBM Plex Mono / Bebas Neue / Archivo) embedded
so typography is faithful AND text stays editable. The full-raster twins in _pptx/ remain
the guaranteed-exact tier; these in _pptx_editable/ are the editable tier.

Run with the Playwright python (d:/tmp/pptx-test/venv). Usage:
gold_to_pptx_hybrid.py [name ...]   (default = all gold *.html)."""
import sys
import os
import pathlib
import tempfile
from playwright.sync_api import sync_playwright
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

ROOT = pathlib.Path(__file__).resolve().parents[2]
GOLD = ROOT / "hic-workspace/wiki/design-system/gold"
OUT = GOLD / "_pptx_editable"
OUT.mkdir(exist_ok=True)
sys.path.insert(0, str(ROOT / "proxy"))

W, H = 1920, 1080
EMU = 914400
# The 1920px stage maps to 13.333in => 144 px/in, so px->pt = px * 72/144 = px * 0.5.
# (The old 1280px exporter used 96 px/in => *0.75; copying that here oversized every glyph 1.5x,
# which was the real cause of the text overflow/collisions.)
PX2PT = 13.333 * 72.0 / W   # = 0.5 exactly for W=1920
def ex(px): return Emu(int(px / W * 13.333 * EMU))
def ey(px): return Emu(int(px / H * 7.5 * EMU))
ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "justify": PP_ALIGN.JUSTIFY}

# Neutralize the fit-script transform so getBoundingClientRect == true 1920x1080 coords.
RESET = ("<style>html,body{margin:0!important;padding:0!important;overflow:visible!important;background:#fff}"
         "#stage{transform:none!important;left:0!important;top:0!important;position:absolute!important}</style>")

MEASURE = r"""
(sel) => {
  const stage = document.querySelector(sel);
  const sr = stage.getBoundingClientRect();
  const toHex = (c) => { if(!c) return null; const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    const p=m[1].split(',').map(s=>parseFloat(s.trim())); if(p.length>=4&&p[3]===0) return null;
    const h=n=>('0'+Math.round(n).toString(16)).slice(-2); return (h(p[0])+h(p[1])+h(p[2])).toUpperCase(); };
  // ELEMENT walk, splitting on BLOCK-level children (by COMPUTED display, so display:block
  // spans like .cap/.why/.actor split out) but keeping INLINE formatting (<b>/<i>/<span>)
  // TOGETHER as one run. An element's OWN text = its content up to its first block child,
  // measured with a Range (true bbox + width). This avoids both the merge-overflow (one giant
  // run) and the inline-split jumble (a <b> breaking a sentence into overlapping fragments).
  const isBlock=(el)=>{const d=getComputedStyle(el).display;
    return /^(block|flex|grid|table|list-item|flow-root)/.test(d);};
  const runs=[];
  const emit=(rg, el)=>{
    const txt=rg.toString().replace(/\s+/g,' ').trim();
    if(!txt) return;
    const rb=rg.getBoundingClientRect();
    if(rb.width<1 || rb.height<1) return;
    const cs=getComputedStyle(el);
    const eb=el.getBoundingClientRect();   // the element's ALLOCATED box (design space)
    runs.push({text:txt, x:rb.left-sr.left, y:rb.top-sr.top, w:rb.width, h:rb.height, tw:rb.width,
      eright:eb.right-sr.left, ebottom:eb.bottom-sr.top,
      size:parseFloat(cs.fontSize)||16, weight:parseInt(cs.fontWeight)||400, color:toHex(cs.color)||'141414',
      align:cs.textAlign||'left', transform:cs.textTransform||'none',
      family:(cs.fontFamily||'').split(',')[0].replace(/['"]/g,'').trim(), spacing:cs.letterSpacing,
      italic:cs.fontStyle==='italic', lh:parseFloat(cs.lineHeight)||0});
  };
  const walk=(el)=>{
    if(el.tagName==='svg' || el.closest('svg')) return; // svg stays in the graphic layer
    // SVG is also a hard BOUNDARY for own-text ranges (Range.toString would otherwise pull in
    // the svg's <text> labels, e.g. the emotion curve's ANXIOUS/DEFLATED, as a jumbled HTML run).
    const bounds=Array.from(el.children).filter(k=>k.tagName==='svg' || isBlock(k));
    const rg=document.createRange(); rg.selectNodeContents(el);
    if(bounds.length) rg.setEndBefore(bounds[0]);
    emit(rg, el);
    bounds.forEach((bk,i)=>{
      if(bk.tagName!=='svg') walk(bk);   // recurse into block children, never into svg
      const after=document.createRange(); after.setStartAfter(bk);
      if(i+1<bounds.length) after.setEndBefore(bounds[i+1]); else after.setEnd(el, el.childNodes.length);
      emit(after, el);
    });
  };
  walk(stage);
  return {runs};
}
"""


def _place_runs(slide, runs):
    """Editable text layer: one shrink-to-fit textbox per measured run (shared by
    the single-#stage and multi-.gold-page paths)."""
    for r in runs:
        txt = r["text"]
        if not txt.strip():
            continue
        if r.get("transform") == "uppercase":
            txt = txt.upper()
        _lh = r.get("lh") or (r["size"] * 1.3)
        _align = r.get("align", "left")
        eright = min(r.get("eright", r["x"] + r["w"]), W - 24)
        ebottom = r.get("ebottom", r["y"] + r["h"])
        bx = r["x"]
        bw = max(8.0, eright - bx)
        bh = max(_lh, ebottom - r["y"], 12.0)
        right_anchored = (r["y"] < 100) and (r["x"] + r["w"] > W * 0.9) and (r["w"] < W * 0.5)
        if right_anchored:
            _align = "right"; bx = r["x"] - 20; bw = (W - 24) - bx
        PW = 1.14
        tw = r.get("tw") or r["w"]
        target_lines = max(1, round(bh / _lh)) if _lh else 1
        scale = min(1.0, (target_lines * bw) / max(tw * PW, 1.0))
        _size_px = r["size"] * scale
        bh = max(bh, target_lines * (_lh * scale) + 4)
        tb = slide.shapes.add_textbox(ex(bx), ey(r["y"]), ex(bw), ey(bh))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.auto_size = None
        tf.vertical_anchor = MSO_ANCHOR.TOP
        for mgn in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
            setattr(tf, mgn, 0)
        p = tf.paragraphs[0]; p.alignment = ALIGN.get(_align, PP_ALIGN.LEFT)
        lh = (r.get("lh") or 0) * scale
        p.line_spacing = Pt(lh * PX2PT) if lh else 1.0
        p.space_before = Pt(0); p.space_after = Pt(0)
        run = p.add_run(); run.text = txt
        run.font.name = r.get("family") or "Archivo"
        run.font.size = Pt(max(5, _size_px * PX2PT))
        run.font.bold = (r.get("weight", 400) >= 600)
        run.font.italic = bool(r.get("italic"))
        run.font.color.rgb = RGBColor.from_string(r.get("color") or "141414")
        sp = r.get("spacing")
        if sp and sp not in ("normal",):
            try:
                run._r.get_or_add_rPr().set("spc", str(int(float(str(sp).replace("px", "")) * PX2PT * 100)))
            except Exception:
                pass


def _embed_fonts(out_path):
    try:
        import pptx_export as pe
        pe.FONT_FAMILIES = pe.FONT_FAMILIES + [
            {"typeface": "Lora", "pitchFamily": 18, "charset": 0, "regular": "Lora.ttf"},
            {"typeface": "IBM Plex Mono", "pitchFamily": 49, "charset": 0,
             "regular": "IBMPlexMono-Regular.ttf", "bold": "IBMPlexMono-SemiBold.ttf"},
        ]
        pe.embed_brand_fonts(str(out_path))
    except Exception as e:
        print(f"    (font embed skipped: {e})")


def _build_multi(name, page, n_pages):
    """One deck from an N-page gold file: isolate each .gold-page at (0,0),
    run the same measure + text-transparent graphic capture, one slide per page."""
    url = page.url
    prs = Presentation(); prs.slide_width, prs.slide_height = Emu(int(13.333*EMU)), Emu(int(7.5*EMU))
    total_runs = 0
    for k in range(n_pages):
        page.goto(url, wait_until="networkidle", timeout=30000)
        try:
            page.evaluate("async () => { await document.fonts.ready; }")
        except Exception:
            pass
        page.evaluate("(k) => { document.querySelectorAll('.gold-page')[k].classList.add('__pptx_active'); }", k)
        page.add_style_tag(content=
            ".gold-page{display:none !important}"
            ".gold-page.__pptx_active{display:block !important;position:fixed !important;"
            "left:0 !important;top:0 !important;margin:0 !important}"
            "html,body{overflow:hidden !important;background:#fff !important}")
        page.wait_for_timeout(300)
        m = page.evaluate(MEASURE, ".gold-page.__pptx_active")
        page.add_style_tag(content=".gold-page.__pptx_active *:not(svg):not(svg *){color:transparent !important;"
                                   "text-shadow:none !important;-webkit-text-stroke:0 !important;}")
        page.wait_for_timeout(120)
        bgfile = tempfile.NamedTemporaryFile(suffix=".png", delete=False); bgfile.close()
        page.screenshot(path=bgfile.name, clip={"x": 0, "y": 0, "width": W, "height": H})
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.shapes.add_picture(bgfile.name, 0, 0, width=Emu(int(13.333*EMU)), height=Emu(int(7.5*EMU)))
        pathlib.Path(bgfile.name).unlink(missing_ok=True)
        _place_runs(slide, m["runs"])
        total_runs += len(m["runs"])
    out = OUT / f"{name}.pptx"
    prs.save(str(out))
    _embed_fonts(out)
    print(f"  hybrid {name}.pptx  ({n_pages} pages, {total_runs} editable text runs)")
    return True


def build(name, page):
    f = GOLD / f"{name}.html"
    if not f.exists():
        print(f"  MISSING {name}"); return False
    html = (f.read_text(encoding="utf-8")).replace("</head>", RESET + "</head>", 1)
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(html); tmp.close()
    page.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
    # CRITICAL: wait for web fonts to load before measuring, else geometry is captured with
    # fallback-font metrics and every position below the h1 is wrong (h1 wrap height differs).
    try:
        page.evaluate("async () => { await document.fonts.ready; }")
    except Exception:
        pass
    page.wait_for_timeout(500)
    # 2026-06-10 - MULTI-PAGE gold twins. Newer gold files carry N x 1920x1080
    # `.gold-page` sections (one per deck page) instead of a single #stage.
    # For multi-page files, isolate each section at (0,0) and run the same
    # measure + graphic-layer flow per page, emitting ONE deck with one slide
    # per page. Single-#stage files behave exactly as before.
    has_stage = page.evaluate("() => !!document.querySelector('#stage')")
    n_pages = page.evaluate("() => document.querySelectorAll('.gold-page').length")
    if n_pages and not has_stage:
        ok = _build_multi(name, page, n_pages)
        pathlib.Path(tmp.name).unlink(missing_ok=True)
        return ok
    m = page.evaluate(MEASURE, "#stage")
    # --- GRAPHIC LAYER: render the slide with all HTML TEXT made invisible, so the screenshot
    #     captures ONLY graphics (rail, dot mark, cell fills, lines/bands, SVG curves+labels,
    #     maturity tracks, accent borders). SVG uses `fill` not `color`, so the curves survive.
    #     This becomes a pixel-exact background; no text is baked in, so the editable text
    #     overlaid on top can never double or ghost. ("graphics graphics, text text")
    page.add_style_tag(content="#stage *:not(svg):not(svg *){color:transparent !important;"
                               "text-shadow:none !important;-webkit-text-stroke:0 !important;}")
    page.wait_for_timeout(120)
    bgfile = tempfile.NamedTemporaryFile(suffix=".png", delete=False); bgfile.close()
    page.screenshot(path=bgfile.name, clip={"x": 0, "y": 0, "width": W, "height": H})
    pathlib.Path(tmp.name).unlink(missing_ok=True)

    prs = Presentation(); prs.slide_width, prs.slide_height = Emu(int(13.333*EMU)), Emu(int(7.5*EMU))
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    # graphic layer, full-bleed
    slide.shapes.add_picture(bgfile.name, 0, 0, width=Emu(int(13.333*EMU)), height=Emu(int(7.5*EMU)))
    pathlib.Path(bgfile.name).unlink(missing_ok=True)
    # TEXT LAYER: editable text boxes on top of the clean graphic background.
    # (Placement logic shared with the multi-page path via _place_runs.)
    _place_runs(slide, m["runs"])
    out = OUT / f"{name}.pptx"
    prs.save(str(out))
    _embed_fonts(out)
    print(f"  hybrid {name}.pptx  ({len(m['runs'])} editable text runs over graphic bg)")
    return True


names = sys.argv[1:] or [p.stem for p in sorted(GOLD.glob("*.html"))]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
    made = sum(1 for n in names if build(n, pg))
    b.close()
print(f"[done] {made} hybrid editable PPTX twins -> {OUT}")
